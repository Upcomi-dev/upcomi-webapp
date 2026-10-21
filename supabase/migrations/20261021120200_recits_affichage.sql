-- Affichage des récits sur la fiche — brique `feat/partage-experience` (T2).
--
-- Remplace 20260904000000_event_stories_display.sql et
-- 20260905120000_recits_valides.sql, jamais appliquées : elles redéfinissaient
-- `get_event_story_counts()`, que la prod utilise déjà pour l'onboarding
-- (récits validés **et** en attente, comptes connectés seulement, durcie par
-- 20261007202118_event_story_counts.sql). Cette migration n'y touche pas.
--
-- Deux fonctions **nouvelles**, rien d'existant n'est modifié : sans risque
-- pour la prod, qui ne les appelle pas.

-- Les récits d'un évènement : validés, plus le sien quel que soit son état.
-- `security definer` : la policy de `select` ne laisse voir que ses propres
-- récits. Réservée aux personnes connectées — le contenu d'un récit est
-- identifiant. Le `drop` rend la migration rejouable si une version de
-- `get_event_stories` au retour différent existe déjà (aucun code en prod ne
-- l'appelle).
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
  'Récits validés d''un évènement, plus le sien quel que soit son état de relecture. Réservée aux personnes connectées.';

-- Le teaser des personnes déconnectées : combien de récits **validés**. Ouverte
-- à anon — un compteur n'est pas du contenu identifiant. Distincte de
-- `get_event_story_counts()`, qui répond à une autre question (l'évènement
-- est-il déjà couvert ?) et ne doit pas changer.
create or replace function public.get_event_approved_story_count(p_event_id bigint)
  returns bigint
  language sql
  stable
  security definer
  set search_path to 'public'
  as $$
    select count(*)::bigint
    from public.user_event_stories s
    where s.event_id = p_event_id
      and s.status = 'approved';
  $$;

revoke all on function public.get_event_approved_story_count(bigint) from public;
grant execute on function public.get_event_approved_story_count(bigint) to anon, authenticated, service_role;

comment on function public.get_event_approved_story_count(bigint) is
  'Nombre de récits validés d''un évènement. Ouverte à anon : un compteur n''est pas du contenu identifiant.';
