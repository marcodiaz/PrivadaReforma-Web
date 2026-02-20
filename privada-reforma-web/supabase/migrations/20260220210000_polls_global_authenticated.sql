-- Ensure polls are globally visible to any authenticated account,
-- even if profile role assignment is pending.

alter table public.polls enable row level security;

drop policy if exists polls_select_authenticated on public.polls;
create policy polls_select_authenticated
on public.polls
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists polls_insert_authenticated on public.polls;
create policy polls_insert_authenticated
on public.polls
for insert
to authenticated
with check (auth.uid() is not null and created_by_user_id = auth.uid());

drop policy if exists polls_update_authenticated on public.polls;
create policy polls_update_authenticated
on public.polls
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists polls_delete_admin on public.polls;
create policy polls_delete_admin
on public.polls
for delete
to authenticated
using (public.current_user_role() = 'admin');
