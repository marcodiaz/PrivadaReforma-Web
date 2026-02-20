-- Align app role naming and allow pet post author edits.

drop policy if exists moderation_reports_select_reporter_or_admin_board on public.moderation_reports;
create policy moderation_reports_select_reporter_or_admin_board
on public.moderation_reports
for select
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.current_user_role() in ('admin', 'board_member', 'board')
);

drop policy if exists moderation_reports_update_admin_board on public.moderation_reports;
create policy moderation_reports_update_admin_board
on public.moderation_reports
for update
to authenticated
using (public.current_user_role() in ('admin', 'board_member', 'board'))
with check (public.current_user_role() in ('admin', 'board_member', 'board'));

drop policy if exists moderation_reports_delete_admin_board on public.moderation_reports;
create policy moderation_reports_delete_admin_board
on public.moderation_reports
for delete
to authenticated
using (public.current_user_role() in ('admin', 'board_member', 'board'));

drop policy if exists pet_posts_update_admin on public.pet_posts;
create policy pet_posts_update_author_or_admin
on public.pet_posts
for update
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.current_user_role() in ('admin', 'board_member', 'board')
)
with check (
  created_by_user_id = auth.uid()
  or public.current_user_role() in ('admin', 'board_member', 'board')
);
