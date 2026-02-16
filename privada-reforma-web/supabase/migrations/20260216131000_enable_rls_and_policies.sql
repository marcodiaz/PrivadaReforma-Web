-- RLS + policies for roles:
-- resident/tenant: read/write only their unit rows
-- guard: packages only (read all, create, delivery-status update)
-- board_member: read-only across all units
-- admin: full access

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid()
$$;

create or replace function public.current_user_unit_number()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.unit_number
  from public.profiles p
  where p.user_id = auth.uid()
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_unit_number() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.incidents enable row level security;
alter table public.qr_passes enable row level security;
alter table public.audit_log enable row level security;

-- Profiles
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert
on public.profiles
for insert
to authenticated
with check (public.current_user_role() = 'admin');

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
on public.profiles
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete
on public.profiles
for delete
to authenticated
using (public.current_user_role() = 'admin');

-- Packages select
drop policy if exists packages_select_by_role on public.packages;
create policy packages_select_by_role
on public.packages
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'guard', 'board_member')
  or (
    public.current_user_role() in ('resident', 'tenant')
    and unit_number = public.current_user_unit_number()
  )
);

-- Packages insert
drop policy if exists packages_insert_admin on public.packages;
create policy packages_insert_admin
on public.packages
for insert
to authenticated
with check (public.current_user_role() = 'admin');

drop policy if exists packages_insert_guard on public.packages;
create policy packages_insert_guard
on public.packages
for insert
to authenticated
with check (
  public.current_user_role() = 'guard'
  and status = 'stored'
  and stored_by_guard_user_id = auth.uid()
);

-- Packages update
drop policy if exists packages_update_admin on public.packages;
create policy packages_update_admin
on public.packages
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists packages_update_guard on public.packages;
create policy packages_update_guard
on public.packages
for update
to authenticated
using (public.current_user_role() = 'guard')
with check (public.current_user_role() = 'guard');

drop policy if exists packages_update_resident_tenant on public.packages;
create policy packages_update_resident_tenant
on public.packages
for update
to authenticated
using (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
)
with check (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
);

drop policy if exists packages_delete_admin on public.packages;
create policy packages_delete_admin
on public.packages
for delete
to authenticated
using (public.current_user_role() = 'admin');

-- Guardrail trigger for package updates.
-- Enforces "guard updates delivery status only" and resident/tenant unit-only ready confirmation flow.
create or replace function public.enforce_package_update_rules()
returns trigger
language plpgsql
as $$
declare
  role_name text;
  unit_num text;
begin
  role_name := public.current_user_role();
  unit_num := public.current_user_unit_number();

  if role_name = 'admin' then
    return new;
  end if;

  if role_name = 'guard' then
    if old.id is distinct from new.id
      or old.unit_number is distinct from new.unit_number
      or old.photo_url is distinct from new.photo_url
      or old.carrier is distinct from new.carrier
      or old.notes is distinct from new.notes
      or old.created_at is distinct from new.created_at
      or old.stored_by_guard_user_id is distinct from new.stored_by_guard_user_id
      or old.ready_at is distinct from new.ready_at
      or old.ready_by_user_id is distinct from new.ready_by_user_id then
      raise exception 'Guard can only update delivery fields on packages.';
    end if;

    if not (old.status = 'ready_for_pickup' and new.status = 'delivered') then
      raise exception 'Guard can only move package status from ready_for_pickup to delivered.';
    end if;

    if new.delivered_by_guard_user_id is distinct from auth.uid() then
      raise exception 'delivered_by_guard_user_id must be current guard user.';
    end if;

    if new.delivered_at is null then
      raise exception 'delivered_at is required when guard marks delivered.';
    end if;

    return new;
  end if;

  if role_name in ('resident', 'tenant') then
    if old.unit_number is distinct from unit_num then
      raise exception 'Resident/Tenant can only update packages for their unit.';
    end if;

    if old.id is distinct from new.id
      or old.unit_number is distinct from new.unit_number
      or old.photo_url is distinct from new.photo_url
      or old.carrier is distinct from new.carrier
      or old.notes is distinct from new.notes
      or old.created_at is distinct from new.created_at
      or old.stored_by_guard_user_id is distinct from new.stored_by_guard_user_id
      or old.delivered_at is distinct from new.delivered_at
      or old.delivered_by_guard_user_id is distinct from new.delivered_by_guard_user_id then
      raise exception 'Resident/Tenant can only confirm pickup readiness fields.';
    end if;

    if not (old.status = 'stored' and new.status = 'ready_for_pickup') then
      raise exception 'Resident/Tenant can only move package status from stored to ready_for_pickup.';
    end if;

    if new.ready_by_user_id is distinct from auth.uid() then
      raise exception 'ready_by_user_id must be current resident/tenant user.';
    end if;

    if new.ready_at is null then
      raise exception 'ready_at is required when resident/tenant confirms pickup.';
    end if;

    return new;
  end if;

  raise exception 'Role "%" is not allowed to update packages.', coalesce(role_name, 'unknown');
end;
$$;

drop trigger if exists trg_packages_enforce_update_rules on public.packages;
create trigger trg_packages_enforce_update_rules
before update on public.packages
for each row
execute function public.enforce_package_update_rules();

-- Incidents
drop policy if exists incidents_select_by_role on public.incidents;
create policy incidents_select_by_role
on public.incidents
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member')
  or (
    public.current_user_role() in ('resident', 'tenant')
    and unit_number = public.current_user_unit_number()
  )
);

drop policy if exists incidents_insert_admin on public.incidents;
create policy incidents_insert_admin
on public.incidents
for insert
to authenticated
with check (public.current_user_role() = 'admin');

drop policy if exists incidents_insert_resident_tenant on public.incidents;
create policy incidents_insert_resident_tenant
on public.incidents
for insert
to authenticated
with check (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
  and created_by_user_id = auth.uid()
);

drop policy if exists incidents_update_admin on public.incidents;
create policy incidents_update_admin
on public.incidents
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists incidents_update_resident_tenant on public.incidents;
create policy incidents_update_resident_tenant
on public.incidents
for update
to authenticated
using (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
)
with check (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
);

drop policy if exists incidents_delete_admin on public.incidents;
create policy incidents_delete_admin
on public.incidents
for delete
to authenticated
using (public.current_user_role() = 'admin');

-- QR passes (minimal stub)
drop policy if exists qr_passes_select_by_role on public.qr_passes;
create policy qr_passes_select_by_role
on public.qr_passes
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member')
  or (
    public.current_user_role() in ('resident', 'tenant')
    and unit_number = public.current_user_unit_number()
  )
);

drop policy if exists qr_passes_insert_admin on public.qr_passes;
create policy qr_passes_insert_admin
on public.qr_passes
for insert
to authenticated
with check (public.current_user_role() = 'admin');

drop policy if exists qr_passes_insert_resident_tenant on public.qr_passes;
create policy qr_passes_insert_resident_tenant
on public.qr_passes
for insert
to authenticated
with check (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
  and created_by_user_id = auth.uid()
);

drop policy if exists qr_passes_update_admin on public.qr_passes;
create policy qr_passes_update_admin
on public.qr_passes
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists qr_passes_update_resident_tenant on public.qr_passes;
create policy qr_passes_update_resident_tenant
on public.qr_passes
for update
to authenticated
using (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
)
with check (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
);

drop policy if exists qr_passes_delete_admin on public.qr_passes;
create policy qr_passes_delete_admin
on public.qr_passes
for delete
to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists qr_passes_delete_resident_tenant on public.qr_passes;
create policy qr_passes_delete_resident_tenant
on public.qr_passes
for delete
to authenticated
using (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
);

-- Audit log (minimal stub)
drop policy if exists audit_log_select_by_role on public.audit_log;
create policy audit_log_select_by_role
on public.audit_log
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member')
  or (
    public.current_user_role() in ('resident', 'tenant')
    and unit_number = public.current_user_unit_number()
  )
);

drop policy if exists audit_log_insert_admin on public.audit_log;
create policy audit_log_insert_admin
on public.audit_log
for insert
to authenticated
with check (public.current_user_role() = 'admin');

drop policy if exists audit_log_insert_resident_tenant on public.audit_log;
create policy audit_log_insert_resident_tenant
on public.audit_log
for insert
to authenticated
with check (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
  and actor_user_id = auth.uid()
);

drop policy if exists audit_log_update_admin on public.audit_log;
create policy audit_log_update_admin
on public.audit_log
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists audit_log_update_resident_tenant on public.audit_log;
create policy audit_log_update_resident_tenant
on public.audit_log
for update
to authenticated
using (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
)
with check (
  public.current_user_role() in ('resident', 'tenant')
  and unit_number = public.current_user_unit_number()
  and actor_user_id = auth.uid()
);

drop policy if exists audit_log_delete_admin on public.audit_log;
create policy audit_log_delete_admin
on public.audit_log
for delete
to authenticated
using (public.current_user_role() = 'admin');
