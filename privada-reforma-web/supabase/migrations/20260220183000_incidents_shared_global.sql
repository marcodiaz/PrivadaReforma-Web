-- Make incidents globally visible across authenticated roles and allow global voting.
-- This prevents incidents from disappearing when unit_number/profile unit changes.

drop policy if exists incidents_select_by_role on public.incidents;
create policy incidents_select_by_role
on public.incidents
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member', 'guard', 'resident', 'tenant')
);

drop policy if exists incidents_update_resident_tenant on public.incidents;
create policy incidents_update_resident_tenant
on public.incidents
for update
to authenticated
using (
  public.current_user_role() in ('resident', 'tenant')
)
with check (
  public.current_user_role() in ('resident', 'tenant')
);

create or replace function public.incidents_vote(p_incident_id text, p_value integer)
returns setof public.incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  role_name text;
  existing_vote integer;
  next_votes jsonb;
  next_score integer;
begin
  if p_value not in (-1, 1) then
    raise exception 'Vote must be -1 or 1.';
  end if;

  role_name := public.current_user_role();
  if role_name not in ('resident', 'tenant', 'admin', 'board_member', 'guard') then
    raise exception 'Role not allowed to vote incidents.';
  end if;

  select (vote_item ->> 'value')::integer
  into existing_vote
  from public.incidents i
  cross join lateral jsonb_array_elements(coalesce(i.votes, '[]'::jsonb)) vote_item
  where i.id = p_incident_id
    and vote_item ->> 'userId' = auth.uid()::text
  limit 1;

  if existing_vote is null then
    next_votes := (
      select coalesce(i.votes, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'userId', auth.uid()::text,
          'value', p_value,
          'votedAt', now()::text
        )
      )
      from public.incidents i
      where i.id = p_incident_id
      limit 1
    );
  elsif existing_vote = p_value then
    next_votes := (
      select coalesce(
        jsonb_agg(vote_item) filter (where vote_item ->> 'userId' <> auth.uid()::text),
        '[]'::jsonb
      )
      from public.incidents i
      cross join lateral jsonb_array_elements(coalesce(i.votes, '[]'::jsonb)) vote_item
      where i.id = p_incident_id
      group by i.id
      limit 1
    );
  else
    next_votes := (
      select coalesce(
        jsonb_agg(
          case
            when vote_item ->> 'userId' = auth.uid()::text then
              jsonb_build_object(
                'userId', auth.uid()::text,
                'value', p_value,
                'votedAt', now()::text
              )
            else vote_item
          end
        ),
        '[]'::jsonb
      )
      from public.incidents i
      cross join lateral jsonb_array_elements(coalesce(i.votes, '[]'::jsonb)) vote_item
      where i.id = p_incident_id
      group by i.id
      limit 1
    );
  end if;

  if next_votes is null then
    return;
  end if;

  select coalesce(sum((vote_item ->> 'value')::integer), 0)
  into next_score
  from jsonb_array_elements(next_votes) vote_item;

  return query
  update public.incidents i
  set
    votes = next_votes,
    support_score = next_score
  where i.id = p_incident_id
  returning i.*;
end;
$$;

grant execute on function public.incidents_vote(text, integer) to authenticated;
