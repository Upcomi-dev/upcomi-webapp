-- Réalignement de tous les slugs d'évènements sur une seule règle :
-- « nom + année » (même règle que `getEventSlugCandidates`,
-- src/lib/events/slugs.ts — changer l'une sans l'autre les désaligne).
--
--   1. nom + année du départ            badlands-2027
--      (année non répétée si le nom la porte déjà ; pas d'année sans date)
--   2. nom + date complète, quand plusieurs évènements du même nom tombent la
--      même année                        brm-200-km-audax-club-parisien-20270307
--   3. suffixe -1, -2… en dernier recours (même nom, même jour), par id.
--
-- Avant : trois familles coexistaient — le nom seul avec des « -1 » pour les
-- éditions annuelles, des BRM importés au format « club + date », et quelques
-- slugs posés à la main. Un enregistrement dans /admin recalculait le slug
-- depuis le nom et renommait donc ces fiches.
--
-- Les anciennes adresses ne sont pas redirigées : elles n'étaient pas encore
-- diffusées hors du site. Le bloc embarqué chez les partenaires, lui, passe
-- par l'id (`/embed/pret/<id>`) et n'est pas concerné.

do $$
declare
  duplicates text;
begin
  create temporary table event_slug_realign on commit drop as
  with base as (
    select
      id,
      slug as old_slug,
      public.upcomi_event_slugify("nomEvent") as base,
      to_char("dateEvent"::date, 'YYYY') as year,
      to_char("dateEvent"::date, 'YYYYMMDD') as day
    from public.events
  ),
  yearly as (
    select
      *,
      case
        when year is null or base ~ ('(^|-)' || year || '(-|$)') then base
        else base || '-' || year
      end as with_year
    from base
    where base is not null
  ),
  dated as (
    select
      *,
      case
        when count(*) over (partition by with_year) = 1 or day is null then with_year
        else base || '-' || day
      end as candidate
    from yearly
  ),
  ranked as (
    select *, row_number() over (partition by candidate order by id) - 1 as rank
    from dated
  )
  select
    id,
    old_slug,
    case when rank = 0 then candidate else candidate || '-' || rank end as new_slug
  from ranked;

  select string_agg(new_slug, ', ')
  into duplicates
  from (
    select new_slug from event_slug_realign group by new_slug having count(*) > 1
  ) as clashes;

  if duplicates is not null then
    raise exception 'Réalignement des slugs : doublons après calcul : %', duplicates;
  end if;

  -- En deux temps : l'index unique est vérifié ligne à ligne, et une fiche
  -- peut viser le slug qu'une autre porte encore.
  update public.events as events
  set slug = 'tmp-' || events.id
  from event_slug_realign as realign
  where events.id = realign.id
    and events.slug is distinct from realign.new_slug;

  update public.events as events
  set slug = realign.new_slug
  from event_slug_realign as realign
  where events.id = realign.id
    and events.slug is distinct from realign.new_slug;
end
$$;
