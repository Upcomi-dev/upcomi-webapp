-- Public event proposal flow.
-- Proposed events are inserted directly in public.events with verifie=false.
-- Contact data is stored separately and only visible to admins.

create table if not exists public.event_submission_contacts (
  event_id bigint primary key references public.events(id) on delete cascade,
  contact_name text not null,
  contact_email text not null,
  departure_address text not null,
  departure_postal_code text not null,
  departure_city text not null,
  departure_country text not null,
  submitted_at timestamptz not null default now()
);

alter table public.event_submission_contacts enable row level security;

revoke all on table public.event_submission_contacts from anon;
grant select, insert, update, delete on table public.event_submission_contacts to authenticated;
grant select, insert, update, delete on table public.event_submission_contacts to service_role;

drop policy if exists "Event submission contacts are editable by admins" on public.event_submission_contacts;
create policy "Event submission contacts are editable by admins"
  on public.event_submission_contacts
  for all
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

drop policy if exists "Enable read access for all users" on public.events;
drop policy if exists "Verified events are viewable by everyone" on public.events;
create policy "Verified events are viewable by everyone"
  on public.events
  for select
  to anon, authenticated
  using (verifie = true);
