<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Supabase : jamais de liste non bornée sans pagination

PostgREST tronque silencieusement toute réponse à `max_rows` (1000 lignes). Toute lecture dont le nombre de lignes peut grandir (liste admin, carte, sitemap, export…) passe par `fetchAllRows()` de `src/lib/supabase/fetch-all.ts`, avec un ordre total (colonne unique en dernier `.order()`). Les clients Supabase loguent `[supabase] Réponse tronquée…` quand une requête non paginée revient pile à 1000 lignes : c'est un bug à corriger.
# Supabase : le catalogue ne se lit que depuis le serveur (anti-scraping)

La clé publique Supabase est dans le bundle JS : toute table lisible par `anon` est aspirable via l'API REST. Les règles de lecture du catalogue (events, organisateurs, sous_events, collections, mesures…) exigent `public.is_upcomi_web_server()`, vrai seulement si la requête porte l'en-tête `x-upcomi-server-key` (= `SUPABASE_SERVER_READ_KEY`, envoyé par `src/lib/supabase/server.ts`, jamais exposé au navigateur). Donc : pas de lecture du catalogue avec `@/lib/supabase/client` (passer par une server action bornée), et toute nouvelle table publique reçoit une policy `using ((select public.is_upcomi_web_server()))`, pas `using (true)`.
