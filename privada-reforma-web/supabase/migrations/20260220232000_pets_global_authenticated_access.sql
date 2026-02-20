-- Make pets module globally visible to any authenticated account,
-- regardless of profile role.

alter table public.pet_posts enable row level security;

drop policy if exists pet_posts_select_authenticated on public.pet_posts;
create policy pet_posts_select_authenticated
on public.pet_posts
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists pet_posts_insert_authenticated on public.pet_posts;
create policy pet_posts_insert_authenticated
on public.pet_posts
for insert
to authenticated
with check (
  auth.uid() is not null
  and created_by_user_id = auth.uid()
);

drop policy if exists pet_posts_update_admin on public.pet_posts;
create policy pet_posts_update_admin
on public.pet_posts
for update
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.current_user_role() = 'admin'
)
with check (
  created_by_user_id = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists pet_posts_delete_admin on public.pet_posts;
create policy pet_posts_delete_admin
on public.pet_posts
for delete
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists pet_photos_select_authenticated on storage.objects;
create policy pet_photos_select_authenticated
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pet-photos'
  and auth.uid() is not null
);

drop policy if exists pet_photos_insert_authenticated on storage.objects;
create policy pet_photos_insert_authenticated
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pet-photos'
  and auth.uid() is not null
);

drop policy if exists pet_photos_delete_admin on storage.objects;
create policy pet_photos_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pet-photos'
  and (
    public.current_user_role() = 'admin'
    or owner = auth.uid()
  )
);
