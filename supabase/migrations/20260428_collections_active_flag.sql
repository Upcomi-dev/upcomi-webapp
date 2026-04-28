-- Ensure admin-managed collections can be explicitly published on the home page.

alter table if exists public.collections
  add column if not exists is_active boolean;

alter table if exists public.collections
  alter column is_active set default false;

update public.collections
set is_active = false
where is_active is null;

alter table if exists public.collections
  alter column is_active set not null;

update public.collections
set is_active = true
where is_auto = true
  and auto_type = 'popular'
  and name = 'Populaires';
