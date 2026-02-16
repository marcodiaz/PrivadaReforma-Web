-- Manual profile seed by email (run in Supabase SQL Editor after creating Auth users).
-- This maps your resident account and optional admin account.

-- Resident account requested:
insert into public.profiles (user_id, role, unit_number)
select u.id, 'resident', '1141'
from auth.users u
where lower(u.email) = lower('marcodiaz0493@gmail.com')
on conflict (user_id) do update
set role = excluded.role,
    unit_number = excluded.unit_number;

-- Optional admin account (recommended separate email):
-- 1) Create auth user first in Dashboard -> Authentication -> Users.
-- 2) Update email below and run again.
insert into public.profiles (user_id, role, unit_number)
select u.id, 'admin', null
from auth.users u
where lower(u.email) = lower('marcodiaz0493+admin@gmail.com')
on conflict (user_id) do update
set role = excluded.role,
    unit_number = excluded.unit_number;
