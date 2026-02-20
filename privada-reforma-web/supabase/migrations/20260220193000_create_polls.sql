-- Public polls: any authenticated user can view/create/vote, admin can delete.

create table if not exists public.polls (
  id text primary key,
  title text not null,
  options jsonb not null default '[]'::jsonb,
  votes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  created_by_user_id uuid not null references public.profiles(user_id),
  created_by_name text not null default '',
  constraint polls_options_array check (jsonb_typeof(options) = 'array'),
  constraint polls_votes_array check (jsonb_typeof(votes) = 'array')
);

create index if not exists polls_created_at_idx on public.polls(created_at desc);

alter table public.polls enable row level security;

drop policy if exists polls_select_authenticated on public.polls;
create policy polls_select_authenticated
on public.polls
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists polls_insert_authenticated on public.polls;
create policy polls_insert_authenticated
on public.polls
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
  and created_by_user_id = auth.uid()
);

drop policy if exists polls_update_authenticated on public.polls;
create policy polls_update_authenticated
on public.polls
for update
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
)
with check (
  public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance')
);

drop policy if exists polls_delete_admin on public.polls;
create policy polls_delete_admin
on public.polls
for delete
to authenticated
using (public.current_user_role() = 'admin');

create or replace function public.polls_vote(p_poll_id text, p_option_id text)
returns setof public.polls
language plpgsql
security definer
set search_path = public
as $$
declare
  role_name text;
  option_exists boolean;
  next_votes jsonb;
begin
  role_name := public.current_user_role();
  if role_name not in ('admin', 'board_member', 'guard', 'resident', 'tenant', 'maintenance') then
    raise exception 'Role not allowed to vote polls.';
  end if;

  select exists (
    select 1
    from public.polls p
    cross join lateral jsonb_array_elements(coalesce(p.options, '[]'::jsonb)) option_item
    where p.id = p_poll_id
      and option_item ->> 'id' = p_option_id
  )
  into option_exists;

  if not option_exists then
    raise exception 'Option not found for poll.';
  end if;

  next_votes := (
    with base as (
      select coalesce(vote_item, '{}'::jsonb) as vote_item
      from public.polls p
      left join lateral jsonb_array_elements(coalesce(p.votes, '[]'::jsonb)) vote_item on true
      where p.id = p_poll_id
    )
    select coalesce(
      jsonb_agg(vote_item) filter (where vote_item <> '{}'::jsonb and vote_item ->> 'userId' <> auth.uid()::text),
      '[]'::jsonb
    )
    from base
  ) || jsonb_build_array(
    jsonb_build_object(
      'userId', auth.uid()::text,
      'userName', coalesce(
        (select raw_user_meta_data ->> 'full_name' from auth.users where id = auth.uid()),
        (select email from auth.users where id = auth.uid()),
        'Usuario'
      ),
      'optionId', p_option_id,
      'votedAt', now()::text
    )
  );

  return query
  update public.polls p
  set votes = next_votes
  where p.id = p_poll_id
  returning p.*;
end;
$$;

grant execute on function public.polls_vote(text, text) to authenticated;
