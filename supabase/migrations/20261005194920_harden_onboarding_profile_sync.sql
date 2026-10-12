-- Complète les migrations d'inscription de septembre sans changer les
-- politiques existantes des profils ni exposer leur email ou leur genre.

alter function public.sync_user_public() security invoker;
alter function public.sync_user_public() set search_path = '';

-- Les profils publics manquants sont aussi repris. Les lignes existantes
-- ont déjà été complétées sans écrasement par personnes_interessees.
insert into public.user_public (uid, name, surname, avatar_url, niveau, ville, updated_at)
select uid, name, surname, avatar_url, pref2, ville, now()
from public.users
on conflict (uid) do nothing;

-- Les deux tables sont lisibles par les rôles concernés : les jointures SQL
-- n'ont pas besoin de contourner leur RLS.
alter function public.get_event_interested_people(bigint) security invoker;
alter function public.get_event_interested_people(bigint) set search_path = '';
alter function public.get_event_interested_count(bigint) security invoker;
alter function public.get_event_interested_count(bigint) set search_path = '';

-- Seuls les admins peuvent approuver/rejeter un récit. Toute réécriture par
-- son autrice le remet en attente, conformément à saveEventStory.
alter policy "Stories are insertable by their author"
  on public.user_event_stories
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

alter policy "Stories are updatable by their author"
  on public.user_event_stories
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

create index if not exists user_event_stories_reviewed_by_idx
  on public.user_event_stories (reviewed_by)
  where reviewed_by is not null;

-- La détection des événements déjà couverts doit voir les récits des autres,
-- mais ne retourne que les identifiants d'événements, jamais leur contenu.
-- L'unique fonction privilégiée reste dans un schéma non exposé à PostgREST.
create schema if not exists upcomi_private;
revoke all on schema upcomi_private from public, anon;
grant usage on schema upcomi_private to authenticated, service_role;

create or replace function upcomi_private.get_events_with_stories(p_event_ids bigint[])
  returns table(event_id bigint)
  language sql
  stable
  security definer
  set search_path = ''
  as $$
    select distinct s.event_id
    from public.user_event_stories s
    where (select auth.uid()) is not null
      and s.event_id = any(coalesce(p_event_ids, array[]::bigint[]));
  $$;

revoke all on function upcomi_private.get_events_with_stories(bigint[])
  from public, anon, authenticated;
grant execute on function upcomi_private.get_events_with_stories(bigint[])
  to authenticated, service_role;

create or replace function public.get_events_with_stories(p_event_ids bigint[])
  returns table(event_id bigint)
  language sql
  stable
  security invoker
  set search_path = ''
  as $$
    select event_id from upcomi_private.get_events_with_stories(p_event_ids);
  $$;

revoke all on function public.get_events_with_stories(bigint[]) from public, anon;
grant execute on function public.get_events_with_stories(bigint[]) to authenticated, service_role;

notify pgrst, 'reload schema';
