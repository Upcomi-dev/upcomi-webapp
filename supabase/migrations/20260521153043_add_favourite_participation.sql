alter table public.favourite_events
  add column if not exists participates boolean not null default false;

drop policy if exists "Disable update to all users"
  on public.favourite_events;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'favourite_events'
      and policyname = 'Users can update their own favourite events'
  ) then
    create policy "Users can update their own favourite events"
      on public.favourite_events
      for update
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end
$$;
