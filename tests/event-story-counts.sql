-- Run only against an empty, disposable PostgreSQL database:
-- psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/event-story-counts.sql
-- Everything, including roles and fixtures, is rolled back.
begin;
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create schema upcomi_private;
revoke all on schema upcomi_private from public;
grant usage on schema upcomi_private, auth to authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table public.user_event_stories (
  user_id uuid not null,
  event_id bigint not null,
  status text not null,
  story text not null,
  primary key (user_id, event_id)
);
create index on public.user_event_stories(event_id);
alter table public.user_event_stories enable row level security;
grant select on public.user_event_stories to authenticated;
create policy own_stories on public.user_event_stories for select to authenticated
  using (user_id = (select auth.uid()));
insert into public.user_event_stories values
  ('00000000-0000-4000-8000-000000000001', 11, 'pending', 'Own draft'),
  ('00000000-0000-4000-8000-000000000002', 11, 'approved', 'Other published story'),
  ('00000000-0000-4000-8000-000000000003', 11, 'pending', 'Other private draft'),
  ('00000000-0000-4000-8000-000000000004', 11, 'rejected', 'Rejected story'),
  ('00000000-0000-4000-8000-000000000002', 22, 'rejected', 'Only rejected story'),
  ('00000000-0000-4000-8000-000000000002', 44, 'approved', 'Unrequested story');

\ir ../supabase/migrations/20261007202118_event_story_counts.sql

do $$ begin
  assert not has_function_privilege('anon', 'public.get_event_story_counts(bigint[])', 'execute'), 'Anonymous RPC access';
  assert not has_function_privilege('anon', 'upcomi_private.get_event_story_counts(bigint[])', 'execute'), 'Anonymous private access';
  assert has_function_privilege('authenticated', 'public.get_event_story_counts(bigint[])', 'execute'), 'Authenticated RPC missing';
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $$
declare result jsonb;
begin
  select jsonb_agg(to_jsonb(counts) order by event_id) into result
    from public.get_event_story_counts(array[11,22,33,11,null]::bigint[]) counts;
  assert result = '[{"event_id":11,"story_count":3},{"event_id":22,"story_count":0},{"event_id":33,"story_count":0}]'::jsonb,
    'Counts must include other authors, pending and approved, zero rows, no duplicates or unrequested events';
  assert (select count(*) from public.user_event_stories) = 1, 'RPC must not broaden table RLS';
  assert (select count(*) from public.get_event_story_counts(array[]::bigint[])) = 0, 'Empty IDs';
  assert (select count(*) from public.get_event_story_counts(null)) = 0, 'Null IDs';
end $$;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (select count(*) from public.get_event_story_counts(array[11]::bigint[])) = 0, 'Missing identity must return no counts';
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform * from public.get_event_story_counts(array[11]::bigint[]);
    raise exception 'Anonymous call should fail';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
\echo 'Story count SQL checks passed (all fixtures rolled back).'
