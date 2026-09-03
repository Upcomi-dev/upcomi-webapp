create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('idea', 'bug', 'feedback')),
  status text not null default 'new' check (status in ('new', 'reviewing', 'closed')),
  subject text not null,
  message text not null,
  contact_name text,
  contact_email text,
  page_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_entries_created_at_idx
  on public.feedback_entries (created_at desc);

create index if not exists feedback_entries_status_idx
  on public.feedback_entries (status);

drop trigger if exists set_feedback_entries_updated_at on public.feedback_entries;
create trigger set_feedback_entries_updated_at
  before update on public.feedback_entries
  for each row
  execute function public.update_updated_at_column();

alter table public.feedback_entries enable row level security;

drop policy if exists "Feedback entries are insertable by everyone" on public.feedback_entries;
create policy "Feedback entries are insertable by everyone"
  on public.feedback_entries
  for insert
  with check (true);

drop policy if exists "Feedback entries are viewable by admins" on public.feedback_entries;
create policy "Feedback entries are viewable by admins"
  on public.feedback_entries
  for select
  using (
    (select auth.uid()) in (
      select user_id from public.admin_users
    )
  );

drop policy if exists "Feedback entries are editable by admins" on public.feedback_entries;
create policy "Feedback entries are editable by admins"
  on public.feedback_entries
  for update
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
