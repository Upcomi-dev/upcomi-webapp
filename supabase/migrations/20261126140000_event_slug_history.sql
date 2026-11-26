-- Les anciennes adresses d'une fiche restent valides : quand un évènement
-- change de slug (renommage, changement de date, réalignement), l'ancien est
-- gardé ici et `/event/<ancien-slug>` redirige vers la fiche.
--
-- L'historique est tenu par un trigger et non par l'application : il vaut pour
-- tout ce qui écrit dans `events` — /admin, la revue des propositions, un
-- import, une migration.

create table if not exists public.event_slug_history (
  slug text primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists event_slug_history_event_id_idx
  on public.event_slug_history (event_id);

alter table public.event_slug_history enable row level security;

-- Lecture réservée au serveur web, comme le reste du catalogue.
drop policy if exists "Event slug history is readable by the web server" on public.event_slug_history;
create policy "Event slug history is readable by the web server"
  on public.event_slug_history
  for select
  to anon, authenticated
  using ((select public.is_upcomi_web_server()));

create or replace function public.keep_event_slug_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- `tmp-<id>` : slug de passage des migrations de réalignement, jamais publié.
  if tg_op = 'UPDATE'
    and old.slug is not null
    and new.slug is distinct from old.slug
    and old.slug !~ '^tmp-[0-9]+$'
  then
    insert into public.event_slug_history (slug, event_id)
    values (old.slug, new.id)
    on conflict (slug) do update
      set event_id = excluded.event_id, created_at = now();
  end if;

  -- Un slug porté par une fiche n'est plus un ancien slug : la fiche vivante
  -- gagne toujours, et un slug repris ne redirige plus ailleurs.
  delete from public.event_slug_history where slug = new.slug;

  return new;
end
$$;

revoke all on function public.keep_event_slug_history() from public, anon, authenticated;

drop trigger if exists keep_event_slug_history on public.events;
create trigger keep_event_slug_history
  after insert or update of slug on public.events
  for each row
  execute function public.keep_event_slug_history();
