create table if not exists public.app_comments (
  id text primary key,
  target_type text not null check (target_type in ('poll', 'marketplace_post', 'directory_entry')),
  target_id text not null,
  message text not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid not null references public.profiles(user_id),
  created_by_name text not null
);

create index if not exists app_comments_created_at_idx on public.app_comments(created_at desc);
create index if not exists app_comments_target_idx on public.app_comments(target_type, target_id);

alter table public.app_comments enable row level security;

drop policy if exists app_comments_select_authenticated on public.app_comments;
create policy app_comments_select_authenticated
on public.app_comments
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member', 'board', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists app_comments_insert_authenticated on public.app_comments;
create policy app_comments_insert_authenticated
on public.app_comments
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'board_member', 'board', 'resident', 'tenant', 'maintenance')
  and created_by_user_id = auth.uid()
);
