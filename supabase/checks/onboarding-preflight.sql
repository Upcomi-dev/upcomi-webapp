-- Audit en lecture seule ; une seule réponse pour le CLI et le SQL Editor.
-- Ne retourne aucune donnée personnelle.
select jsonb_build_object(
  'columns', (
    select coalesce(jsonb_agg(to_jsonb(audit_row)), '[]'::jsonb)
    from (
      -- Audit en lecture seule avant rattrapage des migrations d'inscription.
      -- Projet attendu : hgsfjkgvqcougfamkncj (vérifier la cible dans le client SQL).
      -- Ne retourne aucune ligne de données personnelles.

      select table_name, column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('users', 'user_public', 'user_recommended_events', 'user_event_stories')
      order by table_name, ordinal_position
    ) audit_row
  ),
  'rls', (
    select coalesce(jsonb_agg(to_jsonb(audit_row)), '[]'::jsonb)
    from (
      select c.relname as table_name, c.relrowsecurity as rls_enabled,
             c.relforcerowsecurity as rls_forced
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('users', 'user_public', 'user_recommended_events', 'user_event_stories', 'favourite_events', 'admin_users')
    ) audit_row
  ),
  'policies', (
    select coalesce(jsonb_agg(to_jsonb(audit_row)), '[]'::jsonb)
    from (
      select tablename, policyname, permissive, roles, cmd, qual, with_check
      from pg_policies
      where schemaname = 'public'
        and tablename in ('users', 'user_public', 'user_recommended_events', 'user_event_stories', 'favourite_events', 'admin_users')
      order by tablename, policyname
    ) audit_row
  ),
  'grants', (
    select coalesce(jsonb_agg(to_jsonb(audit_row)), '[]'::jsonb)
    from (
      select table_name, grantee, privilege_type
      from information_schema.table_privileges
      where table_schema = 'public'
        and table_name in ('users', 'user_public', 'user_recommended_events', 'user_event_stories', 'favourite_events')
        and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
      order by table_name, grantee, privilege_type
    ) audit_row
  ),
  'triggers', (
    select coalesce(jsonb_agg(to_jsonb(audit_row)), '[]'::jsonb)
    from (
      select c.relname as table_name, t.tgname, pg_get_triggerdef(t.oid) as definition
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('users', 'user_public')
        and not t.tgisinternal
    ) audit_row
  ),
  'functions', (
    select coalesce(jsonb_agg(to_jsonb(audit_row)), '[]'::jsonb)
    from (
      select p.oid::regprocedure as signature, p.prosecdef as security_definer,
             p.proconfig as settings, p.proacl as permissions,
             pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('sync_user_public', 'get_event_interested_people', 'get_event_interested_count', 'get_events_with_stories')
    ) audit_row
  ),
  'migration_history', (
    select coalesce(jsonb_agg(to_jsonb(audit_row)), '[]'::jsonb)
    from (
      -- Vérifier d'abord l'existence du journal avant de le consulter séparément.
      select to_regclass('supabase_migrations.schema_migrations') as migration_history
    ) audit_row
  )
) as onboarding_audit;
