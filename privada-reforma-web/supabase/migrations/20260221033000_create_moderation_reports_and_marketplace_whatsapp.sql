alter table public.marketplace_posts
add column if not exists whatsapp_number text null;

create table if not exists public.moderation_reports (
  id text primary key,
  target_type text not null check (target_type in ('incident', 'pet_post', 'marketplace_post')),
  target_id text not null,
  reason text not null,
  details text null,
  status text not null check (status in ('open', 'dismissed', 'actioned')) default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid not null references public.profiles(user_id),
  created_by_name text not null,
  handled_by_user_id uuid null references public.profiles(user_id),
  handled_note text null
);

create index if not exists moderation_reports_status_idx on public.moderation_reports(status);
create index if not exists moderation_reports_target_idx on public.moderation_reports(target_type, target_id);
create index if not exists moderation_reports_created_by_idx on public.moderation_reports(created_by_user_id);
create index if not exists moderation_reports_created_at_idx on public.moderation_reports(created_at desc);

drop trigger if exists trg_moderation_reports_set_updated_at on public.moderation_reports;
create trigger trg_moderation_reports_set_updated_at
before update on public.moderation_reports
for each row
execute function public.set_updated_at();

alter table public.moderation_reports enable row level security;

drop policy if exists moderation_reports_select_reporter_or_admin_board on public.moderation_reports;
create policy moderation_reports_select_reporter_or_admin_board
on public.moderation_reports
for select
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.current_user_role() in ('admin', 'board_member')
);

drop policy if exists moderation_reports_insert_authenticated on public.moderation_reports;
create policy moderation_reports_insert_authenticated
on public.moderation_reports
for insert
to authenticated
with check (
  auth.uid() is not null
  and created_by_user_id = auth.uid()
);

drop policy if exists moderation_reports_update_admin_board on public.moderation_reports;
create policy moderation_reports_update_admin_board
on public.moderation_reports
for update
to authenticated
using (public.current_user_role() in ('admin', 'board_member'))
with check (public.current_user_role() in ('admin', 'board_member'));

drop policy if exists moderation_reports_delete_admin_board on public.moderation_reports;
create policy moderation_reports_delete_admin_board
on public.moderation_reports
for delete
to authenticated
using (public.current_user_role() in ('admin', 'board_member'));
