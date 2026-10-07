-- Additive: keep get_events_with_stories for older frontend deployments.
-- The private function can count other members' pending stories without
-- granting access to their contents. Rejected stories do not count.
create or replace function upcomi_private.get_event_story_counts(p_event_ids bigint[])
  returns table(event_id bigint, story_count bigint)
  language sql
  stable
  security definer
  set search_path = ''
  as $$
    select requested.event_id, count(s.event_id) as story_count
    from (
      select distinct id as event_id
      from unnest(coalesce(p_event_ids, array[]::bigint[])) as ids(id)
      where id is not null
    ) requested
    left join public.user_event_stories s
      on s.event_id = requested.event_id
      and s.status in ('approved', 'pending')
    where (select auth.uid()) is not null
    group by requested.event_id;
  $$;

revoke all on function upcomi_private.get_event_story_counts(bigint[])
  from public, anon, authenticated;
grant execute on function upcomi_private.get_event_story_counts(bigint[])
  to authenticated, service_role;

create or replace function public.get_event_story_counts(p_event_ids bigint[])
  returns table(event_id bigint, story_count bigint)
  language sql
  stable
  security invoker
  set search_path = ''
  as $$
    select event_id, story_count
    from upcomi_private.get_event_story_counts(p_event_ids);
  $$;

revoke all on function public.get_event_story_counts(bigint[]) from public, anon;
grant execute on function public.get_event_story_counts(bigint[]) to authenticated, service_role;

notify pgrst, 'reload schema';
