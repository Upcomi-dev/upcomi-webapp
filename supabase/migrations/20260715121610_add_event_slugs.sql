-- Add canonical slug-only URLs for public events.

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

create or replace function public.upcomi_event_slugify(value text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        lower(extensions.unaccent(coalesce(value, ''))),
        '[^a-z0-9]+',
        '-',
        'g'
      ),
      '(^-|-$)',
      '',
      'g'
    ),
    ''
  );
$$;

alter table public.events
  add column if not exists slug text;

do $$
declare
  event_record record;
  base_slug text;
  candidate_slug text;
  suffix integer;
  invalid_event_ids text;
begin
  create temporary table if not exists event_slug_backfill (
    id bigint primary key,
    slug text not null unique
  ) on commit drop;

  truncate table event_slug_backfill;

  for event_record in
    select id, public.upcomi_event_slugify("nomEvent") as generated_slug
    from public.events
    where slug is null
    order by id
  loop
    base_slug := event_record.generated_slug;

    if base_slug is null then
      continue;
    end if;

    candidate_slug := base_slug;
    suffix := 0;

    while exists (
      select 1
      from event_slug_backfill
      where lower(slug) = lower(candidate_slug)
    ) or exists (
      select 1
      from public.events
      where slug is not null
        and lower(slug) = lower(candidate_slug)
        and id <> event_record.id
    ) loop
      suffix := suffix + 1;
      candidate_slug := base_slug || '-' || suffix::text;
    end loop;

    insert into event_slug_backfill (id, slug)
    values (event_record.id, candidate_slug);
  end loop;

  update public.events as events
  set slug = backfill.slug
  from event_slug_backfill as backfill
  where events.id = backfill.id;

  select string_agg(id::text, ', ' order by id)
  into invalid_event_ids
  from public.events
  where slug is null;

  if invalid_event_ids is not null then
    raise exception
      'Cannot add event slugs: these events have a missing or non-sluggable nomEvent: %',
      invalid_event_ids;
  end if;
end
$$;

alter table public.events
  alter column slug set not null;

alter table public.events
  add constraint events_slug_format_check
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create unique index if not exists events_slug_lower_unique_idx
  on public.events (lower(slug));
