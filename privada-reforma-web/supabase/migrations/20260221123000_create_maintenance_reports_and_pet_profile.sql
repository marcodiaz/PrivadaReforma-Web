alter table public.pet_posts
add column if not exists profile jsonb null;

create table if not exists public.maintenance_reports (
  id text primary key,
  title text not null,
  description text not null,
  report_type text not null check (report_type in ('plumbing', 'electrical', 'lighting', 'common_area', 'security', 'other')),
  photo_url text not null,
  unit_number text not null,
  status text not null check (status in ('open', 'in_progress', 'resolved')) default 'open',
  created_at timestamptz not null default now(),
  created_by_user_id uuid not null references public.profiles(user_id),
  created_by_name text not null
);

create index if not exists maintenance_reports_created_at_idx on public.maintenance_reports(created_at desc);
create index if not exists maintenance_reports_status_idx on public.maintenance_reports(status);
create index if not exists maintenance_reports_unit_idx on public.maintenance_reports(unit_number);

alter table public.maintenance_reports enable row level security;

drop policy if exists maintenance_reports_select_authenticated on public.maintenance_reports;
create policy maintenance_reports_select_authenticated
on public.maintenance_reports
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member', 'board', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists maintenance_reports_insert_authenticated on public.maintenance_reports;
create policy maintenance_reports_insert_authenticated
on public.maintenance_reports
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'board_member', 'board', 'resident', 'tenant', 'maintenance')
  and created_by_user_id = auth.uid()
);

drop policy if exists maintenance_reports_update_admin_board_guard on public.maintenance_reports;
create policy maintenance_reports_update_admin_board_guard
on public.maintenance_reports
for update
to authenticated
using (public.current_user_role() in ('admin', 'board_member', 'board', 'guard'))
with check (public.current_user_role() in ('admin', 'board_member', 'board', 'guard'));
