-- `public.users` a la RLS activée (baseline) mais aucune policy : toute
-- lecture/écriture y échoue avec « new row violates row-level security
-- policy », y compris l'upsert du parcours d'inscription
-- (`src/lib/profile-mutations.ts`) et les lectures du profil
-- (`src/app/profil/page.tsx`, `src/app/layout.tsx`).
--
-- On autorise chacune à lire/écrire sa propre ligne, sur le même modèle que
-- `user_recommended_events` (20260901103000_onboarding_v2.sql).

drop policy if exists "Users can view their own row" on public.users;
create policy "Users can view their own row"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = uid);

drop policy if exists "Users can insert their own row" on public.users;
create policy "Users can insert their own row"
  on public.users
  for insert
  to authenticated
  with check ((select auth.uid()) = uid);

drop policy if exists "Users can update their own row" on public.users;
create policy "Users can update their own row"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = uid)
  with check ((select auth.uid()) = uid);
