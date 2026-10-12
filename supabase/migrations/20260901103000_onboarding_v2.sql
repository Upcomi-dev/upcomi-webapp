-- Onboarding V2 — brique `feat/onboarding-v2` (T1).
--
-- Additif (voir docs/upcomi-v2.md §3) : aucune colonne existante n'est
-- renommée, supprimée ni retypée, et `events` n'est pas touchée (la clé
-- étrangère vit dans la table enfant).
--
--   1. `user_recommended_events` — les événements que l'utilisatrice recommande
--      à la communauté, saisis à l'avant-dernière étape du parcours.
--
-- Le genre, déclaré à l'étape « identité » du parcours, réutilise la colonne
-- `users.gender` déjà existante (utilisée par l'admin) plutôt que d'en créer
-- une nouvelle : voir `src/lib/profile.ts`.

-- 1. Événements recommandés --------------------------------------------------
--
-- Table dédiée plutôt qu'un drapeau sur `favourite_events` : « je recommande
-- cet événement à la communauté » n'est ni « je l'ai mis en favori » ni « j'y
-- participe », et les trois doivent pouvoir diverger.

create table if not exists public.user_recommended_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id bigint not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists user_recommended_events_event_id_idx
  on public.user_recommended_events (event_id);

-- RLS et grants dans la même migration que la création de la table : sans ça,
-- la table est une API HTTP publique dès sa création (voir docs/upcomi-v2.md §3).

alter table public.user_recommended_events enable row level security;

revoke all on table public.user_recommended_events from anon, authenticated;
grant select, insert, delete on table public.user_recommended_events to authenticated;
grant select, insert, update, delete on table public.user_recommended_events to service_role;

drop policy if exists "Recommendations are viewable by their owner" on public.user_recommended_events;
create policy "Recommendations are viewable by their owner"
  on public.user_recommended_events
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Recommendations are insertable by their owner" on public.user_recommended_events;
create policy "Recommendations are insertable by their owner"
  on public.user_recommended_events
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Recommendations are deletable by their owner" on public.user_recommended_events;
create policy "Recommendations are deletable by their owner"
  on public.user_recommended_events
  for delete
  using ((select auth.uid()) = user_id);
