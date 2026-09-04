-- Seuls les récits validés s'affichent — brique `feat/partage-experience`.
--
-- `20260905110000_moderation_recits.sql` (brique `feat/onboarding-v2`) a ajouté
-- `user_event_stories.status`. **Cette migration en dépend** : elle doit être
-- appliquée après, sinon les fonctions ci-dessous cherchent une colonne absente.
--
-- Ce qui change : les deux fonctions de lecture créées par
-- `20260904000000_event_stories_display.sql` ne rendent plus que les récits
-- `approved`. `create or replace` sur des fonctions existantes, aucune table ni
-- policy touchée.

-- 1. Les récits d'un évènement ------------------------------------------------
--
-- Une exception à la règle : **son propre récit reste visible**, quel que soit
-- son état. Sans elle, écrire un récit le ferait disparaître aussitôt — ce qui
-- se lit comme une panne, pas comme une relecture. Il n'est montré qu'à son
-- autrice, qui n'apprend rien qu'elle ne vienne d'écrire, et la colonne
-- `status` accompagne la ligne pour que la fiche puisse le dire.
--
-- `drop` avant `create` : `create or replace` refuse d'ajouter une colonne au
-- type de retour (« cannot change return type »).
drop function if exists public.get_event_stories(bigint);

create or replace function public.get_event_stories(p_event_id bigint)
  returns table(
    user_id uuid,
    story text,
    story_url text,
    created_at timestamptz,
    status text,
    author_name text,
    author_avatar_url text
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
      up.avatar_url as author_avatar_url
    from public.user_event_stories s
    left join public.user_public up on up.uid = s.user_id
    where s.event_id = p_event_id
      and (s.status = 'approved' or s.user_id = (select auth.uid()))
    order by s.created_at desc;
  $$;

revoke all on function public.get_event_stories(bigint) from public, anon;
grant execute on function public.get_event_stories(bigint) to authenticated, service_role;

comment on function public.get_event_stories(bigint) is
  'Récits validés d''un évènement, plus le sien quel que soit son état de relecture. Réservée aux personnes connectées : le contenu d''un récit est identifiant.';

-- 2. Le compteur ---------------------------------------------------------------
--
-- Lui ne compte que les récits validés, sans exception : il est ouvert à `anon`
-- et sert à annoncer ce qu'on gagne à créer un compte. Y compter un récit en
-- attente promettrait une lecture qui n'existe pas encore.

create or replace function public.get_event_story_counts(p_event_ids bigint[])
  returns table(event_id bigint, story_count bigint)
  language sql
  stable
  security definer
  set search_path to 'public'
  as $$
    select s.event_id, count(*)::bigint as story_count
    from public.user_event_stories s
    where s.event_id = any(coalesce(p_event_ids, array[]::bigint[]))
      and s.status = 'approved'
    group by s.event_id;
  $$;

revoke all on function public.get_event_story_counts(bigint[]) from public;
grant execute on function public.get_event_story_counts(bigint[]) to anon, authenticated, service_role;

comment on function public.get_event_story_counts(bigint[]) is
  'Nombre de récits validés par évènement. Ouverte à anon : un compteur n''est pas du contenu identifiant.';
