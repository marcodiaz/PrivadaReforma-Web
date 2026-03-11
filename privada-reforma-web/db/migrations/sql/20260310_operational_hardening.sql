create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '');
$$;

create or replace function public.current_unit_number()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'unit_number', '');
$$;

create or replace function public.is_ops_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'board');
$$;

create or replace function public.is_guard_role()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'guard';
$$;

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  event_at timestamptz not null default now(),
  unit_number text,
  user_id text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists operational_events_event_at_idx
  on public.operational_events (event_at desc);

create index if not exists operational_events_event_type_idx
  on public.operational_events (event_type);

alter table public.operational_events enable row level security;

drop policy if exists "operational_events_select_ops" on public.operational_events;
create policy "operational_events_select_ops"
on public.operational_events
for select
to authenticated
using (public.is_ops_admin() or public.is_guard_role());

drop policy if exists "operational_events_insert_ops" on public.operational_events;
create policy "operational_events_insert_ops"
on public.operational_events
for insert
to authenticated
with check (public.is_ops_admin() or public.is_guard_role());

alter table if exists public.packages enable row level security;

drop policy if exists "packages_select_authenticated" on public.packages;
create policy "packages_select_scoped"
on public.packages
for select
to authenticated
using (
  public.is_ops_admin()
  or public.is_guard_role()
  or (
    public.current_app_role() in ('resident', 'tenant')
    and nullif(public.current_unit_number(), '') is not null
    and unit_number = public.current_unit_number()
  )
);

drop policy if exists "packages_mutate_guard_role" on public.packages;
create policy "packages_mutate_guard_role"
on public.packages
for all
to authenticated
using (public.is_guard_role() or public.is_ops_admin())
with check (public.is_guard_role() or public.is_ops_admin());

alter table if exists public.incidents enable row level security;

drop policy if exists "incidents_select_authenticated" on public.incidents;
create policy "incidents_select_scoped"
on public.incidents
for select
to authenticated
using (
  public.is_ops_admin()
  or public.is_guard_role()
  or (
    public.current_app_role() in ('resident', 'tenant')
    and (
      unit_number is null
      or (
        nullif(public.current_unit_number(), '') is not null
        and unit_number = public.current_unit_number()
      )
    )
  )
);

drop policy if exists "incidents_mutate_authenticated" on public.incidents;
create policy "incidents_insert_resident_or_ops"
on public.incidents
for insert
to authenticated
with check (
  public.is_ops_admin()
  or public.is_guard_role()
  or public.current_app_role() in ('resident', 'tenant')
);

drop policy if exists "incidents_update_ops_only" on public.incidents;
create policy "incidents_update_ops_only"
on public.incidents
for update
to authenticated
using (public.is_ops_admin() or public.is_guard_role())
with check (public.is_ops_admin() or public.is_guard_role());

alter table if exists public.parking_reports enable row level security;

drop policy if exists "parking_reports_select_authenticated" on public.parking_reports;
create policy "parking_reports_select_scoped"
on public.parking_reports
for select
to authenticated
using (
  public.is_ops_admin()
  or public.is_guard_role()
  or (
    public.current_app_role() in ('resident', 'tenant')
    and nullif(public.current_unit_number(), '') is not null
    and unit_number = public.current_unit_number()
  )
);

drop policy if exists "parking_reports_insert_authenticated" on public.parking_reports;
create policy "parking_reports_insert_scoped"
on public.parking_reports
for insert
to authenticated
with check (
  public.is_ops_admin()
  or public.current_app_role() in ('resident', 'tenant')
);

drop policy if exists "parking_reports_update_authenticated" on public.parking_reports;
create policy "parking_reports_update_guard_or_ops"
on public.parking_reports
for update
to authenticated
using (public.is_guard_role() or public.is_ops_admin())
with check (public.is_guard_role() or public.is_ops_admin());
