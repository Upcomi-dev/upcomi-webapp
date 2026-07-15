-- Keep this migration autonomous for databases where the original proposal
-- flow migration has not been applied yet.
create table if not exists public.event_submission_contacts (
  event_id bigint primary key references public.events(id) on delete cascade,
  contact_name text not null,
  contact_email text not null,
  departure_address text,
  departure_postal_code text,
  departure_city text not null,
  departure_country text,
  submitted_at timestamptz not null default now()
);

alter table public.event_submission_contacts enable row level security;

revoke all on table public.event_submission_contacts from anon;
grant select, insert, update, delete on table public.event_submission_contacts to authenticated;
grant select, insert, update, delete on table public.event_submission_contacts to service_role;

drop policy if exists "Event submission contacts are editable by admins"
  on public.event_submission_contacts;
create policy "Event submission contacts are editable by admins"
  on public.event_submission_contacts
  for all
  to authenticated
  using (
    (select auth.uid()) in (
      select user_id from public.admin_users
    )
  )
  with check (
    (select auth.uid()) in (
      select user_id from public.admin_users
    )
  );

-- The simplified proposal form only collects a departure city. These ALTERs
-- also make the migration compatible with an existing legacy contacts table.
alter table public.event_submission_contacts
  alter column departure_address drop not null,
  alter column departure_postal_code drop not null,
  alter column departure_country drop not null;

-- Serialize organizer creation so concurrent public submissions cannot add a
-- new case-insensitive duplicate. Historical duplicates are deliberately kept.
create or replace function public.ensure_organisateur(organizer_name text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_name text := btrim(organizer_name);
  existing_name text;
begin
  if normalized_name = '' then
    raise exception 'Organizer name is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(lower(normalized_name), 0));

  select btrim(o.nom_orga)
    into existing_name
    from public.organisateurs o
   where lower(btrim(o.nom_orga)) = lower(normalized_name)
   order by o.id
   limit 1;

  if existing_name is not null then
    return existing_name;
  end if;

  insert into public.organisateurs (nom_orga)
  values (normalized_name);

  return normalized_name;
end;
$$;

revoke all on function public.ensure_organisateur(text) from public, anon, authenticated;
grant execute on function public.ensure_organisateur(text) to service_role;
