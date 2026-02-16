-- Server-side action RPC for package transitions + incident voting.
-- These functions reduce client race conditions and enforce transition rules centrally.

create or replace function public.packages_mark_ready(p_package_id text)
returns setof public.packages
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('resident', 'tenant', 'admin') then
    raise exception 'Role not allowed to mark package ready.';
  end if;

  return query
  update public.packages p
  set
    status = 'ready_for_pickup',
    ready_at = now(),
    ready_by_user_id = auth.uid()
  where p.id = p_package_id
    and (
      public.current_user_role() = 'admin'
      or (
        public.current_user_role() in ('resident', 'tenant')
        and p.unit_number = public.current_user_unit_number()
      )
    )
    and p.status = 'stored'
  returning p.*;
end;
$$;

grant execute on function public.packages_mark_ready(text) to authenticated;

create or replace function public.packages_deliver(p_package_id text)
returns setof public.packages
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('guard', 'admin') then
    raise exception 'Role not allowed to deliver package.';
  end if;

  return query
  update public.packages p
  set
    status = 'delivered',
    delivered_at = now(),
    delivered_by_guard_user_id = auth.uid()
  where p.id = p_package_id
    and p.status = 'ready_for_pickup'
  returning p.*;
end;
$$;

grant execute on function public.packages_deliver(text) to authenticated;

create or replace function public.incidents_vote(p_incident_id text, p_value integer)
returns setof public.incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  role_name text;
  unit_num text;
  existing_vote integer;
  next_votes jsonb;
  next_score integer;
begin
  if p_value not in (-1, 1) then
    raise exception 'Vote must be -1 or 1.';
  end if;

  role_name := public.current_user_role();
  unit_num := public.current_user_unit_number();
  if role_name not in ('resident', 'tenant', 'admin') then
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
        and (
          role_name = 'admin'
          or (role_name in ('resident', 'tenant') and i.unit_number = unit_num)
        )
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
        and (
          role_name = 'admin'
          or (role_name in ('resident', 'tenant') and i.unit_number = unit_num)
        )
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
        and (
          role_name = 'admin'
          or (role_name in ('resident', 'tenant') and i.unit_number = unit_num)
        )
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
    and (
      role_name = 'admin'
      or (role_name in ('resident', 'tenant') and i.unit_number = unit_num)
    )
  returning i.*;
end;
$$;

grant execute on function public.incidents_vote(text, integer) to authenticated;
