-- Score d'adéquation — brique `feat/score-adequation` (T2).
--
-- Trois ajouts, tous additifs (voir docs/upcomi-v2.md §3) : aucune colonne
-- existante n'est renommée, supprimée ni retypée, et `events` n'est pas
-- touchée.
--
--   1. `user_compatibility_answers` — les réponses au questionnaire.
--   2. `user_public.niveau` — le niveau déclaré à l'onboarding, rendu lisible
--      par les autres membres, sans ouvrir `public.users` pour autant.
--   3. `get_event_interested_people()` — qui s'intéresse à un évènement.


-- 1. Réponses au questionnaire ------------------------------------------------
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


-- 2. Le niveau, lisible par les autres membres ---------------------------------
--
-- Le bloc « qui participe déjà » compare mon expérience à celle des personnes
-- déjà intéressées. Leur niveau vit dans `users.pref2`, dont la RLS ne laisse
-- voir que sa propre ligne (20260903000000_users_own_row_rls.sql) — l'ouvrir
-- reviendrait à ouvrir tout le profil, c'est-à-dire à faire `feat/socle-data`.
--
-- `public.user_public` existe précisément pour ça : « table qui affiche les
-- infos aux autres users », déjà lisible par `authenticated`, déjà alimentée
-- par un trigger. On y ajoute le niveau, rien d'autre — jamais les réponses au
-- questionnaire, qui restent privées.

alter table public.user_public
  add column if not exists niveau text;

comment on column public.user_public.niveau is
  'Copie de users.pref2 (niveau déclaré à l''inscription), visible des autres membres connectés.';

-- Le trigger existant ne recopiait que nom, prénom et avatar. `create or
-- replace` sur la fonction et sur le trigger : la liste des colonnes surveillées
-- fait partie de la définition du trigger, la changer suppose de le réécrire.
create or replace function public.sync_user_public() returns trigger
    language plpgsql
    as $$
begin
  insert into public.user_public (uid, name, surname, avatar_url, niveau, updated_at)
  values (new.uid, new.name, new.surname, new.avatar_url, new.pref2, now())
  on conflict (uid)
  do update set
    name = excluded.name,
    surname = excluded.surname,
    avatar_url = excluded.avatar_url,
    niveau = excluded.niveau,
    updated_at = now();

  return new;
end;
$$;

create or replace trigger trg_sync_user_public
  after insert or update of name, surname, avatar_url, pref2
  on public.users
  for each row execute function public.sync_user_public();

-- Backfill des comptes existants. Rejouable sans dégât : ne touche que les
-- lignes dont le niveau est encore vide, et n'écrase donc jamais une valeur
-- posée depuis (voir docs/upcomi-v2.md §3, « migrations touchant des données
-- existantes »).
update public.user_public up
   set niveau = u.pref2
  from public.users u
 where u.uid = up.uid
   and up.niveau is null
   and u.pref2 is not null;


-- 3. Les personnes intéressées par un évènement --------------------------------
--
-- « Intéressé·e » = a mis l'évènement en favori : c'est ce qu'écrit le bouton
-- « Ça m'intéresse ».
--
-- `security definer` non pas pour contourner une policy — les deux tables sont
-- lisibles — mais parce que la clé étrangère de `favourite_events.user_id`
-- pointe sur `users.uid` et non sur `user_public.uid` : PostgREST ne sait donc
-- pas embarquer l'un dans l'autre, et la jointure doit se faire ici.
--
-- Réservée aux comptes connectés, comme dans le prototype où la liste est
-- derrière un « rejoins la communauté pour voir qui est déjà intéressé·e ». Le
-- compteur, lui, reste public : `get_event_favourite_counts()` s'en charge.

create or replace function public.get_event_interested_people(p_event_id bigint)
  returns table(uid uuid, name text, surname text, avatar_url text, niveau text)
  language sql
  stable
  security definer
  set search_path to 'public'
  as $$
    -- `distinct` : rien n'empêche deux lignes de `favourite_events` pour le
    -- même couple (personne, évènement) — il n'y a pas de contrainte d'unicité
    -- sur cette table, et les données de production en portent.
    select distinct up.uid, up.name, up.surname, up.avatar_url, up.niveau
    from public.favourite_events fe
    join public.user_public up on up.uid = fe.user_id
    where fe.event = p_event_id;
  $$;

revoke all on function public.get_event_interested_people(bigint) from public, anon;
grant execute on function public.get_event_interested_people(bigint) to authenticated, service_role;

-- Le compteur, lui, est public : on peut savoir combien elles sont sans avoir
-- de compte, pas qui elles sont.
--
-- `get_event_favourite_counts()` existe déjà mais compte des *lignes* de
-- favoris ; avec les doublons ci-dessus, il annonçait onze personnes là où la
-- liste en montrait dix. Elle reste en place pour `/admin`, qui compte bien
-- des favoris, et le bloc social a le sien, qui compte des personnes.

create or replace function public.get_event_interested_count(p_event_id bigint)
  returns bigint
  language sql
  stable
  security definer
  set search_path to 'public'
  as $$
    select count(distinct fe.user_id)
    from public.favourite_events fe
    where fe.event = p_event_id;
  $$;

revoke all on function public.get_event_interested_count(bigint) from public;
grant execute on function public.get_event_interested_count(bigint) to anon, authenticated, service_role;
