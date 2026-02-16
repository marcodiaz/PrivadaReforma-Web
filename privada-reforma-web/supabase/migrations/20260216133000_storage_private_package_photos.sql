-- Private storage bucket + policies for package photos.
-- photos are referenced by public.packages.photo_url as storage object path (storage.objects.name)

insert into storage.buckets (id, name, public)
values ('package-photos', 'package-photos', false)
on conflict (id) do update
set public = excluded.public;

-- Guard/Admin upload permissions
drop policy if exists package_photos_insert_guard_admin on storage.objects;
create policy package_photos_insert_guard_admin
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'package-photos'
  and public.current_user_role() in ('guard', 'admin')
);

-- Read permissions for signed URL generation:
-- - admin/guard/board_member: all package photos
-- - resident/tenant: only photos whose package belongs to their own unit
drop policy if exists package_photos_select_by_role_and_unit on storage.objects;
create policy package_photos_select_by_role_and_unit
on storage.objects
for select
to authenticated
using (
  bucket_id = 'package-photos'
  and exists (
    select 1
    from public.packages p
    where p.photo_url = storage.objects.name
      and (
        public.current_user_role() in ('admin', 'guard', 'board_member')
        or (
          public.current_user_role() in ('resident', 'tenant')
          and p.unit_number = public.current_user_unit_number()
        )
      )
  )
);

-- Optional cleanup permissions:
drop policy if exists package_photos_delete_admin on storage.objects;
create policy package_photos_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'package-photos'
  and public.current_user_role() = 'admin'
);
