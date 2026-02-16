-- Sample RLS policies for packages/incidents and package photo storage.
-- These are examples; adapt them to your real auth/roles model.

alter table public.packages enable row level security;
alter table public.incidents enable row level security;

-- Example read policy: authenticated users can read packages/incidents.
drop policy if exists "packages_select_authenticated" on public.packages;
create policy "packages_select_authenticated"
on public.packages
for select
to authenticated
using (true);

drop policy if exists "incidents_select_authenticated" on public.incidents;
create policy "incidents_select_authenticated"
on public.incidents
for select
to authenticated
using (true);

-- Example write policy:
-- Replace this condition with your own role guard (JWT claim, profiles table, etc).
drop policy if exists "packages_mutate_guard_role" on public.packages;
create policy "packages_mutate_guard_role"
on public.packages
for all
to authenticated
using (coalesce(auth.jwt() ->> 'role', '') in ('guard', 'admin', 'board'))
with check (coalesce(auth.jwt() ->> 'role', '') in ('guard', 'admin', 'board'));

drop policy if exists "incidents_mutate_authenticated" on public.incidents;
create policy "incidents_mutate_authenticated"
on public.incidents
for all
to authenticated
using (true)
with check (true);

-- Storage bucket policies for package photos.
insert into storage.buckets (id, name, public)
values ('package-photos', 'package-photos', true)
on conflict (id) do nothing;

drop policy if exists "package_photos_public_read" on storage.objects;
create policy "package_photos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'package-photos');

drop policy if exists "package_photos_upload_guard_role" on storage.objects;
create policy "package_photos_upload_guard_role"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'package-photos'
  and coalesce(auth.jwt() ->> 'role', '') in ('guard', 'admin')
);
