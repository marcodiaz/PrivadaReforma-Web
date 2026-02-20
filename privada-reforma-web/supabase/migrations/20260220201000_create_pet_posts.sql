-- Public pet posts feed.

create table if not exists public.pet_posts (
  id text primary key,
  pet_name text not null,
  photo_url text not null,
  comments text not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid not null references public.profiles(user_id),
  created_by_name text not null default ''
);

create index if not exists pet_posts_created_at_idx on public.pet_posts(created_at desc);

alter table public.pet_posts enable row level security;

drop policy if exists pet_posts_select_authenticated on public.pet_posts;
create policy pet_posts_select_authenticated
on public.pet_posts
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists pet_posts_insert_authenticated on public.pet_posts;
create policy pet_posts_insert_authenticated
on public.pet_posts
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
  and created_by_user_id = auth.uid()
);

drop policy if exists pet_posts_update_admin on public.pet_posts;
create policy pet_posts_update_admin
on public.pet_posts
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists pet_posts_delete_admin on public.pet_posts;
create policy pet_posts_delete_admin
on public.pet_posts
for delete
to authenticated
using (public.current_user_role() = 'admin');
