-- Récits d'événement — brique `feat/onboarding-v2` (T1).
--
-- Les récits étaient prévus dans `feat/partage-experience` ; la saisie est
-- avancée ici, à la dernière étape du parcours d'inscription. Comme dans le
-- prototype (`upcomi-clone/assets/js/review.js`, étape « links »), un récit est
-- d'abord **un lien** vers l'endroit où il a déjà été publié — Instagram,
-- Strava, un blog. Le texte libre est prévu mais n'est pas encore saisi.
--
-- Additif (voir docs/upcomi-v2.md §3) : nouvelle table, `events` intouchée, la
-- clé étrangère vit dans la table enfant.

create table if not exists public.user_event_stories (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id bigint not null references public.events(id) on delete cascade,
  story_url text,
  story text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, event_id),
  -- Une ligne sans lien ni texte ne dit rien : le parcours n'écrit pas quand
  -- les deux champs sont vides.
  constraint user_event_stories_not_empty check (story_url is not null or story is not null),
  constraint user_event_stories_url_shape check (
    story_url is null or (story_url ~ '^https?://' and char_length(story_url) <= 2048)
  ),
  constraint user_event_stories_story_length check (
    story is null or char_length(story) between 1 and 1500
  )
);

create index if not exists user_event_stories_event_id_idx
  on public.user_event_stories (event_id);

comment on table public.user_event_stories is
  'Récits d''expérience rattachés à un événement : un lien vers le récit publié ailleurs, et un texte libre prévu mais pas encore saisi. Contenu identifiant, lisible par sa seule autrice tant que l''affichage public n''est pas fait.';

-- RLS et grants dans la même migration que la création de la table : sans ça,
-- la table est une API HTTP publique dès sa création (voir docs/upcomi-v2.md §3).
-- Critique ici : un récit est du contenu identifiant.

alter table public.user_event_stories enable row level security;

revoke all on table public.user_event_stories from anon, authenticated;
grant select, insert, update, delete on table public.user_event_stories to authenticated;
grant select, insert, update, delete on table public.user_event_stories to service_role;

drop policy if exists "Stories are viewable by their author" on public.user_event_stories;
create policy "Stories are viewable by their author"
  on public.user_event_stories
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Stories are insertable by their author" on public.user_event_stories;
create policy "Stories are insertable by their author"
  on public.user_event_stories
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Stories are updatable by their author" on public.user_event_stories;
create policy "Stories are updatable by their author"
  on public.user_event_stories
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Stories are deletable by their author" on public.user_event_stories;
create policy "Stories are deletable by their author"
  on public.user_event_stories
  for delete
  using ((select auth.uid()) = user_id);

-- Quels événements ont déjà un récit ------------------------------------------
--
-- Le parcours ne propose qu'un récit, sur le premier événement recommandé qui
-- n'en a pas encore. La policy de `select` ne laissant voir que ses propres
-- récits, il faut une fonction `security definer` pour répondre — sur le modèle
-- de `get_event_favourite_counts()`.
--
-- Elle ne renvoie que des identifiants d'événements, jamais un récit ni son
-- autrice : « cet événement est déjà couvert », rien de plus. Réservée aux
-- personnes connectées, seules concernées par la question.

create or replace function public.get_events_with_stories(p_event_ids bigint[])
  returns table(event_id bigint)
  language sql
  stable
  security definer
  set search_path to 'public'
  as $$
    select distinct s.event_id
    from public.user_event_stories s
    where s.event_id = any(coalesce(p_event_ids, array[]::bigint[]));
  $$;

revoke all on function public.get_events_with_stories(bigint[]) from public, anon;
grant execute on function public.get_events_with_stories(bigint[]) to authenticated, service_role;
