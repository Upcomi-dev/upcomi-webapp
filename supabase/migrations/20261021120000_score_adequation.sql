-- Score d'adéquation — brique `feat/score-adequation` (T2).
--
-- Un seul ajout, additif : `user_compatibility_answers`, les réponses au
-- questionnaire. Le niveau lisible par les autres (`user_public.niveau`) et
-- les fonctions de lecture des intéressées viennent de
-- 20260904160000_personnes_interessees.sql (preprod), dont cette branche
-- portait un doublon — retiré au merge, cf. docs/upcomi-v2.md §2.2.


-- Réponses au questionnaire ------------------------------------------------
--
-- Une ligne par question plutôt qu'un `jsonb` : le catalogue de questions vit
-- dans le code (`src/lib/compatibility/questions.ts`), il bougera, et une
-- question retirée doit pouvoir laisser ses réponses derrière elle sans
-- migration.
--
-- La réponse « itinéraire » n'est jamais écrite ici : elle est propre à un
-- évènement, pas au profil cycliste réutilisé d'une fiche à l'autre.
--
-- Données personnelles : RLS, `revoke`/`grant` et policies dans le même
-- fichier que la création de la table. Sans ça, la table est une API HTTP
-- publique dès sa création.

create table if not exists public.user_compatibility_answers (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null,
  answer_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_key),
  constraint user_compatibility_answers_key_shape check (char_length(question_key) between 1 and 64),
  constraint user_compatibility_answers_value_shape check (char_length(answer_value) between 1 and 64)
);

comment on table public.user_compatibility_answers is
  'Réponses au questionnaire du score d''adéquation. Le catalogue de questions est dans le code, pas ici.';

alter table public.user_compatibility_answers enable row level security;

revoke all on table public.user_compatibility_answers from anon, authenticated;
grant select, insert, update, delete on table public.user_compatibility_answers to authenticated;
grant select, insert, update, delete on table public.user_compatibility_answers to service_role;

drop policy if exists "Answers are viewable by their owner" on public.user_compatibility_answers;
create policy "Answers are viewable by their owner"
  on public.user_compatibility_answers
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Answers are insertable by their owner" on public.user_compatibility_answers;
create policy "Answers are insertable by their owner"
  on public.user_compatibility_answers
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Answers are updatable by their owner" on public.user_compatibility_answers;
create policy "Answers are updatable by their owner"
  on public.user_compatibility_answers
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Answers are deletable by their owner" on public.user_compatibility_answers;
create policy "Answers are deletable by their owner"
  on public.user_compatibility_answers
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
