-- Suivi des usages du bloc « Suis-je prêt·e » embarqué chez les partenaires
-- (`/embed/pret/<id>`), pour l'onglet « Embeds » de /admin.
--
-- Une ligne par étape franchie, sans aucune donnée personnelle : ni compte, ni
-- adresse IP, ni réponses au questionnaire. `partner` est le site qui affiche
-- l'iframe (`www.audax-club-parisien.com`), lu dans le référent.
--
--   view      le bloc s'est affiché
--   start     le questionnaire a été commencé
--   complete  le résultat a été affiché
--   open      clic vers la fiche Upcomi (bouton ou logo)
--   arrival   arrivée sur la fiche Upcomi avec les réponses transmises

create table if not exists public.embed_events (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('view', 'start', 'complete', 'open', 'arrival')),
  partner text check (char_length(partner) <= 120),
  created_at timestamptz not null default now()
);

create index if not exists embed_events_created_at_idx
  on public.embed_events (created_at desc);

create index if not exists embed_events_event_id_idx
  on public.embed_events (event_id);

alter table public.embed_events enable row level security;

-- Écriture réservée au serveur web (en-tête `x-upcomi-server-key`) : la clé
-- publique du navigateur seule ne peut pas remplir la table.
drop policy if exists "Embed events are insertable by the web server" on public.embed_events;
create policy "Embed events are insertable by the web server"
  on public.embed_events
  for insert
  to anon, authenticated
  with check ((select public.is_upcomi_web_server()));

drop policy if exists "Embed events are viewable by admins" on public.embed_events;
create policy "Embed events are viewable by admins"
  on public.embed_events
  for select
  to authenticated
  using ((select auth.uid()) in (select user_id from public.admin_users));

-- Les compteurs par évènement et par partenaire, agrégés en base : l'admin ne
-- rapatrie jamais les lignes pour les compter. `security invoker` : seule une
-- admin voit quelque chose, par la policy ci-dessus.
create or replace function public.get_embed_stats(p_days integer)
returns table (
  event_id bigint,
  event_name text,
  partner text,
  views bigint,
  starts bigint,
  completes bigint,
  opens bigint,
  arrivals bigint,
  last_seen timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    stats.event_id,
    events."nomEvent" as event_name,
    stats.partner,
    stats.views,
    stats.starts,
    stats.completes,
    stats.opens,
    stats.arrivals,
    stats.last_seen
  from (
    select
      embed.event_id,
      embed.partner,
      count(*) filter (where embed.kind = 'view') as views,
      count(*) filter (where embed.kind = 'start') as starts,
      count(*) filter (where embed.kind = 'complete') as completes,
      count(*) filter (where embed.kind = 'open') as opens,
      count(*) filter (where embed.kind = 'arrival') as arrivals,
      max(embed.created_at) as last_seen
    from public.embed_events as embed
    where embed.created_at >= now() - make_interval(days => p_days)
    group by embed.event_id, embed.partner
  ) as stats
  join public.events as events on events.id = stats.event_id
  order by stats.views desc, stats.event_id
  -- Borne dure : un tableau de bord, pas un export.
  limit 500;
$$;

revoke all on function public.get_embed_stats(integer) from public, anon;
grant execute on function public.get_embed_stats(integer) to authenticated;
