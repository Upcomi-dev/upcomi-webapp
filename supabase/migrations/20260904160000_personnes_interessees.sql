-- Bloc « qui est intéressé » — brique `feat/personnes-interessees`.
--
-- Deux ajouts, tous deux additifs (voir docs/upcomi-v2.md §3) : aucune colonne
-- existante n'est renommée, supprimée ni retypée, et ni `users` ni
-- `favourite_events` ne sont touchées.
--
--   1. `user_public.niveau` et `user_public.ville` — le niveau et la ville
--      déclarés à l'inscription, rendus lisibles par les autres membres, sans
--      ouvrir `public.users` pour autant.
--   2. `get_event_interested_people()` / `get_event_interested_count()` — qui
--      s'intéresse à un évènement, et combien elles sont.


-- 1. Le niveau et la ville, lisibles par les autres membres --------------------
--
-- La feuille « qui est intéressée » montre, sous chaque nom, la ville et le
-- niveau. Les deux vivent dans `public.users` (`ville`, `pref2`), dont la RLS
-- ne laisse voir que sa propre ligne (20260903000000_users_own_row_rls.sql) —
-- l'ouvrir reviendrait à ouvrir tout le profil, c'est-à-dire à faire
-- `feat/socle-data`.
--
-- `public.user_public` existe précisément pour ça : « table qui affiche les
-- infos aux autres users », déjà lisible par `authenticated`, déjà alimentée
-- par un trigger. On y ajoute ces deux colonnes, rien d'autre — jamais l'e-mail
-- ni le genre, qui n'ont rien à faire dans une liste publique.

alter table public.user_public
  add column if not exists niveau text;

alter table public.user_public
  add column if not exists ville text;

comment on column public.user_public.niveau is
  'Copie de users.pref2 (niveau déclaré à l''inscription), visible des autres membres connectés.';

comment on column public.user_public.ville is
  'Copie de users.ville (ville déclarée à l''inscription), visible des autres membres connectés.';

-- Le trigger existant ne recopiait que nom, prénom et avatar. `create or
-- replace` sur la fonction et sur le trigger : la liste des colonnes surveillées
-- fait partie de la définition du trigger, la changer suppose de le réécrire.
create or replace function public.sync_user_public() returns trigger
    language plpgsql
    as $$
begin
  insert into public.user_public (uid, name, surname, avatar_url, niveau, ville, updated_at)
  values (new.uid, new.name, new.surname, new.avatar_url, new.pref2, new.ville, now())
  on conflict (uid)
  do update set
    name = excluded.name,
    surname = excluded.surname,
    avatar_url = excluded.avatar_url,
    niveau = excluded.niveau,
    ville = excluded.ville,
    updated_at = now();

  return new;
end;
$$;

create or replace trigger trg_sync_user_public
  after insert or update of name, surname, avatar_url, pref2, ville
  on public.users
  for each row execute function public.sync_user_public();

-- Backfill des comptes existants. Rejouable sans dégât : ne touche que les
-- lignes dont la colonne est encore vide, et n'écrase donc jamais une valeur
-- posée depuis (voir docs/upcomi-v2.md §3, « migrations touchant des données
-- existantes »).
update public.user_public up
   set niveau = u.pref2
  from public.users u
 where u.uid = up.uid
   and up.niveau is null
   and u.pref2 is not null;

update public.user_public up
   set ville = u.ville
  from public.users u
 where u.uid = up.uid
   and up.ville is null
   and u.ville is not null;


-- 2. Les personnes intéressées par un évènement --------------------------------
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
-- derrière un « rejoins la communauté pour voir qui est déjà intéressé·e ».

-- `drop` avant `create` : `create or replace` refuse de changer le type de
-- retour d'une fonction existante (« cannot change return type »). La fonction
-- n'existe pas en prod, mais elle peut exister sur un poste où la branche
-- `feat/score-adequation` a été jouée — sa version ne renvoie pas `ville`.
drop function if exists public.get_event_interested_people(bigint);

create or replace function public.get_event_interested_people(p_event_id bigint)
  returns table(uid uuid, name text, surname text, avatar_url text, niveau text, ville text)
  language sql
  stable
  security definer
  set search_path to 'public'
  as $$
    -- `distinct` : rien n'empêche deux lignes de `favourite_events` pour le
    -- même couple (personne, évènement) — il n'y a pas de contrainte d'unicité
    -- sur cette table, et les données de production en portent.
    select distinct up.uid, up.name, up.surname, up.avatar_url, up.niveau, up.ville
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
