create table if not exists public.app_features (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.app_features enable row level security;

revoke all on table public.app_features from anon, authenticated;
grant select, update on table public.app_features to service_role;

insert into public.app_features (key, enabled)
values ('event_proposals', false)
on conflict (key) do nothing;
