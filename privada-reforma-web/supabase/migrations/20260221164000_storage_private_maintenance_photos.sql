-- Private storage bucket + policies for maintenance report photos.
-- photos are referenced by public.maintenance_reports.photo_url as storage object path.

insert into storage.buckets (id, name, public)
values ('maintenance-photos', 'maintenance-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists maintenance_photos_insert_authenticated on storage.objects;
create policy maintenance_photos_insert_authenticated
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'maintenance-photos'
  and public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists maintenance_photos_select_authenticated on storage.objects;
create policy maintenance_photos_select_authenticated
on storage.objects
for select
to authenticated
using (
  bucket_id = 'maintenance-photos'
  and public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists maintenance_photos_delete_admin on storage.objects;
create policy maintenance_photos_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'maintenance-photos'
  and public.current_user_role() = 'admin'
);
