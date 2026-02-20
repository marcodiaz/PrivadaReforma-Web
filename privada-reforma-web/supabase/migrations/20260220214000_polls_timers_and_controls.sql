-- Poll timers (1-7 days from app), end early, and creator/admin management.

alter table public.polls
  add column if not exists ends_at timestamptz null,
  add column if not exists ended_at timestamptz null;

update public.polls
set ends_at = created_at + interval '7 days'
where ends_at is null;

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
with check (
  auth.uid() is not null
  and created_by_user_id = auth.uid()
);

drop policy if exists polls_update_authenticated on public.polls;
create policy polls_update_authenticated
on public.polls
for update
to authenticated
using (
  auth.uid() is not null
  and (
    created_by_user_id = auth.uid()
    or public.current_user_role() = 'admin'
  )
)
with check (
  auth.uid() is not null
  and (
    created_by_user_id = auth.uid()
    or public.current_user_role() = 'admin'
  )
);

drop policy if exists polls_delete_admin on public.polls;
create policy polls_delete_admin
on public.polls
for delete
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.current_user_role() = 'admin'
);

create or replace function public.polls_vote(p_poll_id text, p_option_id text)
returns setof public.polls
language plpgsql
security definer
set search_path = public
as $$
declare
  option_exists boolean;
  poll_closed boolean;
  next_votes jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
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

  select exists (
    select 1
    from public.polls p
    where p.id = p_poll_id
      and (
        p.ended_at is not null
        or (p.ends_at is not null and p.ends_at < now())
      )
  )
  into poll_closed;

  if poll_closed then
    raise exception 'Poll is closed.';
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
    and p.ended_at is null
    and (p.ends_at is null or p.ends_at >= now())
  returning p.*;
end;
$$;

grant execute on function public.polls_vote(text, text) to authenticated;
