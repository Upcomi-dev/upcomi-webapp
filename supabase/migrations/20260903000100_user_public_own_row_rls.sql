-- Même trou que `public.users` (20260903000000_users_own_row_rls.sql) :
-- `public.user_public` n'a qu'une policy de lecture (« read all »), donc
-- toute écriture y échoue avec « new row violates row-level security
-- policy », que ce soit l'upsert explicite du parcours d'inscription
-- (`src/lib/profile-mutations.ts`) ou le trigger `trg_sync_user_public`
-- déclenché sur `public.users`, qui s'exécute avec les droits de
-- l'utilisatrice (pas de SECURITY DEFINER) et reste donc soumis à la RLS.

drop policy if exists "Users can insert their own public row" on public.user_public;
create policy "Users can insert their own public row"
  on public.user_public
  for insert
  to authenticated
  with check ((select auth.uid()) = uid);

drop policy if exists "Users can update their own public row" on public.user_public;
create policy "Users can update their own public row"
  on public.user_public
  for update
  to authenticated
  using ((select auth.uid()) = uid)
  with check ((select auth.uid()) = uid);
