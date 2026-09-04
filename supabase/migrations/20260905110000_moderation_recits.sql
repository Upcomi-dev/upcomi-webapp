-- Modération des récits — brique `feat/onboarding-v2`.
--
-- Un récit est du contenu identifiant écrit librement, affiché ensuite sur la
-- fiche d'un évènement à côté de son nom : il ne peut pas être publié sans être
-- relu. On ajoute donc un état de modération, et l'écran qui va avec dans
-- `/admin`.
--
-- Additif (docs/upcomi-v2.md §3) : trois colonnes nullables ou à défaut sur une
-- table existante, une policy en plus. Aucune policy existante n'est retouchée,
-- aucune colonne renommée ni retypée.
--
-- **Ordre d'application** : cette migration doit passer avant celle de
-- `feat/partage-experience` qui filtre l'affichage sur `status = 'approved'`
-- (`20260905120000_recits_valides.sql`). L'inverse laisserait sa fonction
-- chercher une colonne absente.

alter table public.user_event_stories
  add column if not exists status text not null default 'pending';

alter table public.user_event_stories
  drop constraint if exists user_event_stories_status_check;

alter table public.user_event_stories
  add constraint user_event_stories_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table public.user_event_stories
  add column if not exists reviewed_at timestamptz;

alter table public.user_event_stories
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

comment on column public.user_event_stories.status is
  'État de modération : pending (par défaut, jamais affiché), approved (affiché sur la fiche), rejected.';

-- Les récits déjà saisis restent en attente, ce que dit le défaut : rien
-- n'était affiché publiquement jusqu'ici, personne ne perd donc une
-- publication. Les approuver en masse reviendrait à publier sans avoir lu.

-- L'écran d'admin liste par état : l'index sert le filtre « en attente », le
-- seul consulté tous les jours.
create index if not exists user_event_stories_status_idx
  on public.user_event_stories (status, created_at desc);

-- Les admins voient et modèrent tous les récits. Même motif que les policies
-- d'admin existantes (20260422_admin_full_crud_rls.sql) : `/admin` interroge la
-- base en tant que l'admin connectée, pas avec la clé secrète.
drop policy if exists "Stories are moderated by admins" on public.user_event_stories;
create policy "Stories are moderated by admins"
  on public.user_event_stories
  for all
  to authenticated
  using (
    (select auth.uid()) in (select user_id from public.admin_users)
  )
  with check (
    (select auth.uid()) in (select user_id from public.admin_users)
  );
