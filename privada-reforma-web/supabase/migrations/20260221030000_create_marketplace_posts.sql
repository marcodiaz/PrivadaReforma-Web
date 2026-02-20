create table if not exists public.marketplace_posts (
  id text primary key,
  title text not null,
  description text not null,
  price numeric(12,2) not null check (price >= 0),
  photo_url text not null,
  condition text not null check (condition in ('new', 'used')),
  status text not null check (status in ('active', 'sold')) default 'active',
  contact_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid not null references public.profiles(user_id),
  created_by_name text not null
);

create index if not exists marketplace_posts_created_at_idx on public.marketplace_posts(created_at desc);
create index if not exists marketplace_posts_status_idx on public.marketplace_posts(status);
create index if not exists marketplace_posts_created_by_user_id_idx on public.marketplace_posts(created_by_user_id);

drop trigger if exists trg_marketplace_posts_set_updated_at on public.marketplace_posts;
create trigger trg_marketplace_posts_set_updated_at
before update on public.marketplace_posts
for each row
execute function public.set_updated_at();

alter table public.marketplace_posts enable row level security;

drop policy if exists marketplace_posts_select_authenticated on public.marketplace_posts;
create policy marketplace_posts_select_authenticated
on public.marketplace_posts
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists marketplace_posts_insert_authenticated on public.marketplace_posts;
create policy marketplace_posts_insert_authenticated
on public.marketplace_posts
for insert
to authenticated
with check (
  auth.uid() is not null
  and created_by_user_id = auth.uid()
);

drop policy if exists marketplace_posts_update_owner_or_admin on public.marketplace_posts;
create policy marketplace_posts_update_owner_or_admin
on public.marketplace_posts
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

drop policy if exists marketplace_posts_delete_owner_or_admin on public.marketplace_posts;
create policy marketplace_posts_delete_owner_or_admin
on public.marketplace_posts
for delete
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.current_user_role() = 'admin'
);
