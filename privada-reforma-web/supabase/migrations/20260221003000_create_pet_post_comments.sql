-- Comments for pet posts (public among authenticated users).

create table if not exists public.pet_post_comments (
  id text primary key,
  pet_post_id text not null references public.pet_posts(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid not null references public.profiles(user_id),
  created_by_name text not null default ''
);

create index if not exists pet_post_comments_post_id_idx on public.pet_post_comments(pet_post_id);
create index if not exists pet_post_comments_created_at_idx on public.pet_post_comments(created_at asc);

alter table public.pet_post_comments enable row level security;

drop policy if exists pet_post_comments_select_authenticated on public.pet_post_comments;
create policy pet_post_comments_select_authenticated
on public.pet_post_comments
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists pet_post_comments_insert_authenticated on public.pet_post_comments;
create policy pet_post_comments_insert_authenticated
on public.pet_post_comments
for insert
to authenticated
with check (
  auth.uid() is not null
  and created_by_user_id = auth.uid()
);

drop policy if exists pet_post_comments_update_owner_or_admin on public.pet_post_comments;
create policy pet_post_comments_update_owner_or_admin
on public.pet_post_comments
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

drop policy if exists pet_post_comments_delete_owner_or_admin on public.pet_post_comments;
create policy pet_post_comments_delete_owner_or_admin
on public.pet_post_comments
for delete
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.current_user_role() = 'admin'
);
