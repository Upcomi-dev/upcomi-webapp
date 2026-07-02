-- Speed up the public event search used by the home map/list.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_ts_config
    where cfgnamespace = 'public'::regnamespace
      and cfgname = 'upcomi_unaccent'
  ) then
    create text search configuration public.upcomi_unaccent (copy = pg_catalog.simple);
  end if;
end
$$;

alter text search configuration public.upcomi_unaccent
  alter mapping for asciiword, asciihword, hword_asciipart, hword, hword_part, word
  with extensions.unaccent, simple;

alter table public.events
  add column if not exists search_fts tsvector
  generated always as (
    setweight(to_tsvector('public.upcomi_unaccent'::regconfig, coalesce("nomEvent", '')), 'A') ||
    setweight(to_tsvector('public.upcomi_unaccent'::regconfig, coalesce(organisateur, '')), 'B') ||
    setweight(to_tsvector('public.upcomi_unaccent'::regconfig, coalesce("villeDepart", '')), 'B') ||
    setweight(to_tsvector('public.upcomi_unaccent'::regconfig, coalesce("paysDepart", '')), 'C') ||
    setweight(to_tsvector('public.upcomi_unaccent'::regconfig, coalesce(type_event, '')), 'C') ||
    setweight(to_tsvector('public.upcomi_unaccent'::regconfig, coalesce(bike_type, '')), 'C')
  ) stored;

create index if not exists events_public_search_fts_idx
  on public.events using gin (search_fts)
  where verifie = true
    and latitude is not null
    and longitude is not null
    and "dateEvent" is not null;

create index if not exists events_public_search_date_idx
  on public.events ("dateEvent", "dateFin")
  where verifie = true
    and latitude is not null
    and longitude is not null
    and "dateEvent" is not null;

create index if not exists events_public_search_date_fin_idx
  on public.events ("dateFin", "dateEvent")
  where verifie = true
    and latitude is not null
    and longitude is not null
    and "dateEvent" is not null;

create index if not exists events_public_search_region_idx
  on public.events (region, "dateEvent")
  where verifie = true
    and latitude is not null
    and longitude is not null
    and "dateEvent" is not null
    and region is not null;

create index if not exists events_public_search_budget_idx
  on public.events (budget, "dateEvent")
  where verifie = true
    and latitude is not null
    and longitude is not null
    and "dateEvent" is not null
    and budget is not null;

create index if not exists events_public_search_mint_idx
  on public.events ("dateEvent")
  where verifie = true
    and latitude is not null
    and longitude is not null
    and "dateEvent" is not null
    and mint = true;

create index if not exists events_public_search_bike_type_trgm_idx
  on public.events using gin (bike_type gin_trgm_ops)
  where verifie = true
    and latitude is not null
    and longitude is not null
    and "dateEvent" is not null
    and bike_type is not null;

create index if not exists events_public_search_type_event_trgm_idx
  on public.events using gin (type_event gin_trgm_ops)
  where verifie = true
    and latitude is not null
    and longitude is not null
    and "dateEvent" is not null
    and type_event is not null;

create index if not exists events_public_search_distance_trgm_idx
  on public.events using gin (distance_range_filter gin_trgm_ops)
  where verifie = true
    and latitude is not null
    and longitude is not null
    and "dateEvent" is not null
    and distance_range_filter is not null;
