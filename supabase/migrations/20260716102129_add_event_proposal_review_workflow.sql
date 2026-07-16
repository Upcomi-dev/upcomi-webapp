alter table public.event_submission_contacts
  add column if not exists review_status text not null default 'pending',
  add column if not exists review_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

alter table public.event_submission_contacts
  drop constraint if exists event_submission_contacts_review_status_check;
alter table public.event_submission_contacts
  add constraint event_submission_contacts_review_status_check
  check (review_status in ('pending', 'approved', 'rejected'));

update public.event_submission_contacts c
set review_status = case when e.verifie then 'approved' else 'pending' end,
    reviewed_at = case when e.verifie then coalesce(c.reviewed_at, c.submitted_at) else null end
from public.events e
where e.id = c.event_id;

create or replace function public.save_event_proposal_review(
  p_event_id bigint,
  p_event jsonb,
  p_routes jsonb,
  p_status text default null,
  p_reason text default null,
  p_reviewer uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  route jsonb;
  route_count integer;
begin
  if p_status is not null and p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Invalid proposal review status';
  end if;
  if jsonb_typeof(p_routes) <> 'array' or jsonb_array_length(p_routes) = 0 then
    raise exception 'At least one route is required';
  end if;

  route_count := jsonb_array_length(p_routes);

  update public.events
  set "nomEvent" = p_event->>'name',
      slug = p_event->>'slug',
      "dateEvent" = nullif(p_event->>'startDate', '')::date,
      "dateFin" = nullif(p_event->>'endDate', '')::date,
      "villeDepart" = p_event->>'city',
      "paysDepart" = nullif(p_event->>'country', ''),
      description = p_event->>'description',
      "URL" = nullif(p_event->>'url', ''),
      image = nullif(p_event->>'image', ''),
      organisateur = p_event->>'organizer',
      mint = coalesce((p_event->>'mint')::boolean, false),
      type_event = p_event->>'eventType',
      bike_type = p_event->>'bikeType',
      distance = p_event->>'distance',
      distance_range = p_event->>'distanceRange',
      distance_range_filter = p_event->>'distanceFilter',
      "nb_sousEvents" = route_count,
      verifie = case when p_status = 'approved' then true when p_status = 'rejected' then false else verifie end
  where id = p_event_id;

  if not found then raise exception 'Event not found'; end if;

  delete from public.sous_events where event_id = p_event_id;
  for route in select value from jsonb_array_elements(p_routes)
  loop
    insert into public.sous_events (
      event_id, event_name, nom, "bikeType", distance, elevation, prix, trace_fixe, "typeEvent", delai
    ) values (
      p_event_id,
      p_event->>'name',
      nullif(route->>'name', ''),
      route->>'bikeType',
      (route->>'distance')::smallint,
      nullif(route->>'elevation', '')::bigint,
      (route->>'price')::smallint,
      coalesce((route->>'fixedTrack')::boolean, false),
      route->>'eventType',
      nullif(route->>'delay', '')
    );
  end loop;

  if p_status is not null then
    update public.event_submission_contacts
    set review_status = p_status,
        review_reason = case when p_status = 'rejected' then nullif(btrim(p_reason), '') else null end,
        reviewed_at = case when p_status = 'pending' then null else now() end,
        reviewed_by = case when p_status = 'pending' then null else p_reviewer end
    where event_id = p_event_id;
  end if;
end;
$$;

revoke all on function public.save_event_proposal_review(bigint, jsonb, jsonb, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.save_event_proposal_review(bigint, jsonb, jsonb, text, text, uuid)
  to service_role;

create index if not exists event_submission_contacts_review_queue_idx
  on public.event_submission_contacts (review_status, submitted_at desc);
