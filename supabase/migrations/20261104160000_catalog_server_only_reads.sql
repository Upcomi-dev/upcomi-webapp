-- Anti-scraping : le catalogue n'est plus lisible directement via l'API
-- Supabase avec la clé publique (qui est dans le bundle JS). Seul le serveur
-- Next, qui envoie l'en-tête `x-upcomi-server-key` (SUPABASE_SERVER_READ_KEY,
-- jamais exposée au navigateur), passe les règles de lecture.
--
-- Le hash ci-dessous est le SHA-256 de la clé : la clé elle-même n'est pas
-- dans le dépôt. Rotation : nouvelle clé dans l'env Vercel + nouvelle migration
-- avec son hash.
--
-- L'app mobile FlutterFlow, qui lisait ces tables en direct, est arrêtée.
--
-- ⚠️ Déployer le code qui envoie l'en-tête AVANT d'appliquer cette migration,
-- sinon le site ne lit plus rien.

create or replace function public.is_upcomi_web_server()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    encode(
      sha256(convert_to(
        current_setting('request.headers', true)::json ->> 'x-upcomi-server-key',
        'UTF8'
      )),
      'hex'
    ) = '9d38196c97fbf24185050ca0be090a49b26130873f30a8bcfc3c7c56291f0f94',
    false
  );
$$;

grant execute on function public.is_upcomi_web_server() to anon, authenticated, service_role;

-- Catalogue : serveur uniquement. `(select …)` : évalué une fois par requête.
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('app_state',                   'Enable read access for all users'),
      ('collection_events',           'Collection events are viewable by everyone'),
      ('collections',                 'Collections are viewable by everyone'),
      ('event_inclusion_measures',    'Event inclusion measures are viewable by everyone'),
      ('event_registration_measures', 'Event registration measures are viewable by everyone'),
      ('favourite_organisateurs',     'Enable read access for all users'),
      ('friendships',                 'Enable everyone to know who is friend with who'),
      ('inclusion_measures',          'Inclusion measures are viewable by everyone'),
      ('organisateurs',               'Enable read access for all users'),
      ('prix',                        'Enable read access for all users'),
      ('ressources',                  'Enable read access for all users'),
      ('ressources_categories',       'Enable read access for all users'),
      ('social_ride',                 'Enable read access for all users'),
      ('sous_events',                 'Enable read access for all users')
    ) as v(tbl, old_policy)
  loop
    execute format('drop policy if exists %I on public.%I', t.old_policy, t.tbl);
    execute format('drop policy if exists %I on public.%I', 'Readable by the web server', t.tbl);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using ((select public.is_upcomi_web_server()))',
      'Readable by the web server', t.tbl
    );
  end loop;
end $$;

-- Événements : uniquement vérifiés (la prod laissait aussi passer les
-- propositions non vérifiées). Le navigateur garde l'accès à ses favoris.
drop policy if exists "Enable read access for all users" on public.events;
drop policy if exists "Verified events are viewable by everyone" on public.events;
drop policy if exists "Verified events are readable by the web server" on public.events;
create policy "Verified events are readable by the web server"
  on public.events for select to anon, authenticated
  using (verifie = true and (select public.is_upcomi_web_server()));

drop policy if exists "Users can read their favourite events" on public.events;
create policy "Users can read their favourite events"
  on public.events for select to authenticated
  using (
    verifie = true
    and id in (
      select fe.event from public.favourite_events fe
      where fe.user_id = (select auth.uid())
    )
  );

-- Favoris : ses propres lignes depuis le navigateur, le reste via le serveur
-- (qui sait qui s'intéresse à quoi).
drop policy if exists "Enable read access for all users" on public.favourite_events;
drop policy if exists "Own favourites or web server" on public.favourite_events;
create policy "Own favourites or web server"
  on public.favourite_events for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_upcomi_web_server())
  );

-- Profils publics : sa propre ligne, ou le serveur.
drop policy if exists "user_public: read all" on public.user_public;
drop policy if exists "Own public profile or web server" on public.user_public;
create policy "Own public profile or web server"
  on public.user_public for select to authenticated
  using (
    uid = (select auth.uid())
    or (select public.is_upcomi_web_server())
  );

-- Codes promo : membres connectés, via le serveur.
drop policy if exists "Promo codes are viewable by members" on public.event_promo_codes;
drop policy if exists "Promo codes are readable by members via the web server" on public.event_promo_codes;
create policy "Promo codes are readable by members via the web server"
  on public.event_promo_codes for select to authenticated
  using ((select public.is_upcomi_web_server()));

-- get_popular_events() (FlutterFlow, SECURITY DEFINER) renvoie des lignes
-- entières d'events en contournant la RLS. Le site utilise la version
-- get_popular_events(p_limit), qui respecte la RLS.
revoke execute on function public.get_popular_events() from public, anon, authenticated;
