-- Affichage des récits — brique `feat/partage-experience`.
--
-- `20260903001000_event_stories.sql` a créé `user_event_stories` en lecture
-- strictement privée : « lisible par sa seule autrice tant que l'affichage
-- public n'est pas fait » (voir docs/upcomi-v2.md §7). C'est ce qui est fait
-- ici, et la policy de `select` ne bouge pas pour autant — deux fonctions
-- `security definer` exposent exactement ce que la fiche évènement affiche,
-- rien de plus, sur le modèle de `get_events_with_stories()`.
--
-- Additif : aucune table modifiée, aucune policy existante retouchée.

-- 1. Les récits d'un évènement ------------------------------------------------
--
-- Réservée à `authenticated` : lire les retours d'expérience demande un compte
-- (arbitrage produit), et un récit reste du contenu identifiant qui n'a pas à
-- sortir de la base pour un anonyme ni à finir indexé.
--
-- Le prénom seul (`user_public.name`) est renvoyé, jamais le nom de famille :
-- c'est ce qu'affiche le prototype (`event-detail.js`, `storyCard`). `user_id`
-- accompagne la ligne pour que l'autrice se reconnaisse et puisse modifier son
-- récit — c'est déjà son propre identifiant, elle n'apprend rien.

create or replace function public.get_event_stories(p_event_id bigint)
  returns table(
    user_id uuid,
    story text,
    story_url text,
    created_at timestamptz,
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
      nullif(btrim(up.name), '') as author_name,
      up.avatar_url as author_avatar_url
    from public.user_event_stories s
    left join public.user_public up on up.uid = s.user_id
    where s.event_id = p_event_id
    order by s.created_at desc;
  $$;

revoke all on function public.get_event_stories(bigint) from public, anon;
grant execute on function public.get_event_stories(bigint) to authenticated, service_role;

comment on function public.get_event_stories(bigint) is
  'Récits publiés sur un évènement, avec le prénom et l''avatar de leur autrice. Réservée aux personnes connectées : le contenu d''un récit est identifiant.';

-- 2. Combien de récits, sans les lire ------------------------------------------
--
-- Déconnectée, la fiche annonce le nombre de retours d'expérience et propose de
-- créer un compte pour les lire (le « gated block » du prototype, mais sans son
-- aperçu flouté : là-bas le vrai contenu est dans le HTML sous le dégradé).
-- Un compteur n'est pas identifiant, il est donc ouvert à `anon` — même
-- ouverture que `get_event_favourite_counts()`.
--
-- Prend un tableau plutôt qu'un identifiant : la fiche n'en demande qu'un, mais
-- une liste de cartes en demanderait plusieurs et n'aura pas à changer d'API.

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
    group by s.event_id;
  $$;

revoke all on function public.get_event_story_counts(bigint[]) from public;
grant execute on function public.get_event_story_counts(bigint[]) to anon, authenticated, service_role;

comment on function public.get_event_story_counts(bigint[]) is
  'Nombre de récits par évènement. Ouverte à anon : un compteur n''est pas du contenu identifiant.';
