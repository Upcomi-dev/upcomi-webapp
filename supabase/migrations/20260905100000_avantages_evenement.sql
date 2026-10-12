-- Éléments propres à l'évènement, en plus du catalogue de mesures d'inclusion
-- — brique `feat/avantages-evenement`.
--
-- Le catalogue `inclusion_measures` porte des mesures *partagées* : un libellé
-- et une description écrits une fois pour toutes, rattachés à l'évènement par
-- une simple liaison. Ce qui suit est d'une autre nature — des valeurs qui
-- n'existent que pour un évènement donné :
--
--   1. `event_registration_measures` — délais allongés et places réservées pour
--      les femmes et minorités de genre, affichés dans les infos logistiques
--      sous l'ouverture des inscriptions. Lecture publique.
--   2. `event_promo_codes` — le code promo réservé aux membres. Lecture
--      **réservée aux comptes connectés**, plus `has_event_promo_code()` pour
--      savoir qu'il en existe un sans pouvoir le lire.
--
-- Additif de bout en bout (docs/upcomi-v2.md §3) : deux nouvelles tables, la
-- clé étrangère portée par la table enfant, `events` n'est pas modifiée.


-- 1. Dispositions d'inscription ------------------------------------------------
--
-- Deux booléens plutôt qu'un rattachement au catalogue : ce sont des faits
-- propres à un évènement, ils s'affichent avec ses dates et non dans le bloc
-- vert des mesures. Le libellé affiché est écrit côté code — la base ne porte
-- que le fait, pas sa formulation.

create table if not exists public.event_registration_measures (
  event_id integer primary key references public.events(id) on delete cascade,
  -- Délais d'inscription allongés pour les femmes et minorités de genre.
  extended_deadline boolean not null default false,
  -- Places réservées aux femmes et minorités de genre.
  reserved_spots boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.event_registration_measures is
  'Dispositions d''inscription propres à un évènement (délais allongés, places réservées), affichées avec ses dates clés.';

alter table public.event_registration_measures enable row level security;

revoke all on table public.event_registration_measures from anon, authenticated;
grant select on table public.event_registration_measures to anon, authenticated;

-- Lecture publique : la fiche évènement est rendue avec la clé publique et
-- reste consultable sans compte. L'écriture passe par le client admin
-- (`service_role`), qui n'est pas soumis aux policies.
drop policy if exists "Event registration measures are viewable by everyone"
  on public.event_registration_measures;
create policy "Event registration measures are viewable by everyone"
  on public.event_registration_measures
  for select
  using (true);


-- 2. Code promo réservé aux membres --------------------------------------------
--
-- Le code est un avantage membre : le laisser lisible par `anon` reviendrait à
-- le publier, la clé publique étant dans le navigateur de tout le monde. D'où
-- une table sans aucun droit pour `anon` — c'est la base qui tient la promesse,
-- pas l'interface.

create table if not exists public.event_promo_codes (
  event_id integer primary key references public.events(id) on delete cascade,
  code text not null check (length(btrim(code)) between 1 and 64),
  updated_at timestamptz not null default now()
);

comment on table public.event_promo_codes is
  'Code promo réservé aux membres Upcomi. Lecture réservée à authenticated ; anon passe par has_event_promo_code().';

alter table public.event_promo_codes enable row level security;

revoke all on table public.event_promo_codes from anon, authenticated;
grant select on table public.event_promo_codes to authenticated;

drop policy if exists "Promo codes are viewable by members" on public.event_promo_codes;
create policy "Promo codes are viewable by members"
  on public.event_promo_codes
  for select
  to authenticated
  using (true);

-- Savoir qu'un code existe est une information publique — c'est ce qui permet
-- de proposer la création de compte à la bonne personne, sur la bonne fiche.
-- Le code lui-même ne sort jamais d'ici. Même partage que le couple
-- `get_event_interested_people` / `get_event_interested_count` : la liste est
-- derrière le gate, le fait qu'elle existe ne l'est pas.
create or replace function public.has_event_promo_code(p_event_id bigint)
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
  as $$
    select exists (
      select 1 from public.event_promo_codes epc where epc.event_id = p_event_id
    );
  $$;

revoke all on function public.has_event_promo_code(bigint) from public;
grant execute on function public.has_event_promo_code(bigint) to anon, authenticated, service_role;
