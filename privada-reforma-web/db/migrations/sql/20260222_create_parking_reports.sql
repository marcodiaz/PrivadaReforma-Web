create table if not exists public.parking_reports (
  id text primary key,
  unit_number text not null,
  parking_spot text not null,
  report_type text not null check (report_type in ('own_spot', 'visitor_spot')),
  visitor_parking_spot text,
  description text not null,
  photo_url text not null default '',
  status text not null check (status in ('open', 'owner_notified', 'tow_truck_notified')),
  created_at timestamptz not null default now(),
  created_by_user_id text not null,
  guard_note text,
  updated_at timestamptz,
  handled_by_guard_user_id text
);

create index if not exists parking_reports_created_at_idx
  on public.parking_reports (created_at desc);

create index if not exists parking_reports_unit_number_idx
  on public.parking_reports (unit_number);

create index if not exists parking_reports_status_idx
  on public.parking_reports (status);

alter table public.parking_reports enable row level security;

drop policy if exists "parking_reports_select_authenticated" on public.parking_reports;
create policy "parking_reports_select_authenticated"
on public.parking_reports
for select
to authenticated
using (true);

drop policy if exists "parking_reports_insert_authenticated" on public.parking_reports;
create policy "parking_reports_insert_authenticated"
on public.parking_reports
for insert
to authenticated
with check (true);

drop policy if exists "parking_reports_update_authenticated" on public.parking_reports;
create policy "parking_reports_update_authenticated"
on public.parking_reports
for update
to authenticated
using (true)
with check (true);
