-- Allow first-login profile bootstrap for authenticated users.
-- Users can only insert their own profile as resident.

drop policy if exists profiles_self_insert_resident_bootstrap on public.profiles;
create policy profiles_self_insert_resident_bootstrap
on public.profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'resident'
  and unit_number is not null
  and not exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
  )
);
