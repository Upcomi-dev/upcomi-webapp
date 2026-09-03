-- Admin CRUD on events and users tables

drop policy if exists "Disable insert for all users" on public.events;
drop policy if exists "Disable update for all users" on public.events;
drop policy if exists "Disable delete to all users" on public.events;

create policy "Events are editable by admins"
  on public.events
  for all
  using (
    (select auth.uid()) in (
      select user_id from public.admin_users
    )
  )
  with check (
    (select auth.uid()) in (
      select user_id from public.admin_users
    )
  );

create policy "Users are editable by admins"
  on public.users
  for all
  using (
    (select auth.uid()) in (
      select user_id from public.admin_users
    )
  )
  with check (
    (select auth.uid()) in (
      select user_id from public.admin_users
    )
  );

create policy "User public profiles are editable by admins"
  on public.user_public
  for all
  using (
    (select auth.uid()) in (
      select user_id from public.admin_users
    )
  )
  with check (
    (select auth.uid()) in (
      select user_id from public.admin_users
    )
  );
