-- Éditions d'un même évènement annuel (Desertus Bikus 2025, 2026, 2027…).
--
-- Chaque édition reste une ligne `events` : dates, inscriptions et distances
-- changent d'une année sur l'autre, et favoris, récits et mesures sont
-- rattachés à une édition précise. `serie` relie les éditions entre elles
-- (même valeur = même évènement), saisie dans `/admin`.
--
-- Ce que ça change : les récits d'une édition s'affichent aussi sur les
-- éditions suivantes de la même série. On récrit les deux fonctions de lecture
-- de `20261021120200_recits_affichage.sql` ; `get_event_story_counts()`
-- (onboarding) n'est pas touchée.

alter table public.events
  add column if not exists serie text;

comment on column public.events.serie is
  'Identifiant de la série d''éditions (ex. desertus-bikus). Même valeur = même évènement annuel. Null = évènement isolé.';

-- Lu à chaque ouverture de fiche (éditions précédentes).
create index if not exists events_serie_date_idx
  on public.events (serie, "dateEvent")
  where serie is not null;

-- L'édition elle-même et les éditions antérieures **vérifiées** de sa série :
-- une édition non vérifiée n'est pas publiée, ses récits non plus.
create or replace function upcomi_private.event_story_edition_ids(p_event_id bigint)
  returns table(event_id bigint, edition_date date)
  language sql
  stable
  set search_path = ''
  as $$
    select e.id, e."dateEvent"
    from public.events current_edition
    join public.events e
      on e.id = current_edition.id
      or (
        e.serie = current_edition.serie
        and e."dateEvent" < current_edition."dateEvent"
        and e.verifie
      )
    where current_edition.id = p_event_id;
  $$;

revoke all on function upcomi_private.event_story_edition_ids(bigint)
  from public, anon, authenticated;

-- Récits validés (plus le sien) de l'édition et des éditions précédentes.
-- `event_id` et `edition_date` disent de quelle édition vient chaque récit.
drop function if exists public.get_event_stories(bigint);

create or replace function public.get_event_stories(p_event_id bigint)
  returns table(
    user_id uuid,
    story text,
    story_url text,
    created_at timestamptz,
    status text,
    author_name text,
    author_avatar_url text,
    event_id bigint,
    edition_date date
  )
  language sql
  stable
  security definer
  set search_path to 'public'
  as $$
    select
      s.user_id,
      s.story,
      s.story_url,
      s.created_at,
      s.status,
      nullif(btrim(up.name), '') as author_name,
      up.avatar_url as author_avatar_url,
      s.event_id,
      ed.edition_date
    from upcomi_private.event_story_edition_ids(p_event_id) ed
    join public.user_event_stories s on s.event_id = ed.event_id
    left join public.user_public up on up.uid = s.user_id
    where s.status = 'approved' or s.user_id = (select auth.uid())
    order by ed.edition_date desc nulls first, s.created_at desc;
  $$;

revoke all on function public.get_event_stories(bigint) from public, anon;
grant execute on function public.get_event_stories(bigint) to authenticated, service_role;

comment on function public.get_event_stories(bigint) is
  'Récits validés d''un évènement et de ses éditions précédentes (même serie), plus le sien quel que soit son état. Réservée aux personnes connectées.';

create or replace function public.get_event_approved_story_count(p_event_id bigint)
  returns bigint
  language sql
  stable
  security definer
  set search_path to 'public'
  as $$
    select count(*)::bigint
    from upcomi_private.event_story_edition_ids(p_event_id) ed
    join public.user_event_stories s on s.event_id = ed.event_id
    where s.status = 'approved';
  $$;

notify pgrst, 'reload schema';
