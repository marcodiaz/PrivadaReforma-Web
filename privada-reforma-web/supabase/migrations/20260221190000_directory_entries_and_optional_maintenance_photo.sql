alter table if exists public.maintenance_reports
  alter column photo_url drop not null;

create table if not exists public.directory_entries (
  id text primary key,
  provider_name text not null,
  contact_name text null,
  contact_phone text not null,
  contact_whatsapp text null,
  notes text null,
  service_types text[] not null,
  other_service_type text null,
  photo_url text null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid not null references public.profiles(user_id),
  created_by_name text not null,
  constraint directory_entries_service_types_check check (
    array_length(service_types, 1) >= 1
    and service_types <@ array[
      'plumbing',
      'electrical',
      'carpentry',
      'painting',
      'gardening',
      'cleaning',
      'security',
      'internet',
      'appliances',
      'other'
    ]::text[]
  )
);

create index if not exists directory_entries_created_at_idx
  on public.directory_entries(created_at desc);
create index if not exists directory_entries_created_by_idx
  on public.directory_entries(created_by_user_id);

alter table public.directory_entries enable row level security;

drop policy if exists directory_entries_select_authenticated on public.directory_entries;
create policy directory_entries_select_authenticated
on public.directory_entries
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member', 'board', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists directory_entries_insert_authenticated on public.directory_entries;
create policy directory_entries_insert_authenticated
on public.directory_entries
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'board_member', 'board', 'resident', 'tenant', 'maintenance')
  and created_by_user_id = auth.uid()
);

insert into storage.buckets (id, name, public)
values ('directory-photos', 'directory-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists directory_photos_insert_authenticated on storage.objects;
create policy directory_photos_insert_authenticated
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'directory-photos'
  and public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists directory_photos_select_authenticated on storage.objects;
create policy directory_photos_select_authenticated
on storage.objects
for select
to authenticated
using (
  bucket_id = 'directory-photos'
  and public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists directory_photos_delete_admin on storage.objects;
create policy directory_photos_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'directory-photos'
  and public.current_user_role() = 'admin'
);
