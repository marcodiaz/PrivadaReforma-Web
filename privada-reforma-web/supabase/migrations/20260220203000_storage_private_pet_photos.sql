-- Private storage bucket + policies for pet photos.
-- photos are referenced by public.pet_posts.photo_url as storage object path (storage.objects.name)

insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists pet_photos_insert_authenticated on storage.objects;
create policy pet_photos_insert_authenticated
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pet-photos'
  and public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists pet_photos_select_authenticated on storage.objects;
create policy pet_photos_select_authenticated
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pet-photos'
  and public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists pet_photos_delete_admin on storage.objects;
create policy pet_photos_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pet-photos'
  and public.current_user_role() = 'admin'
);
