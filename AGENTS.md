<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Supabase : jamais de liste non bornée sans pagination

PostgREST tronque silencieusement toute réponse à `max_rows` (1000 lignes). Toute lecture dont le nombre de lignes peut grandir (liste admin, carte, sitemap, export…) passe par `fetchAllRows()` de `src/lib/supabase/fetch-all.ts`, avec un ordre total (colonne unique en dernier `.order()`). Les clients Supabase loguent `[supabase] Réponse tronquée…` quand une requête non paginée revient pile à 1000 lignes : c'est un bug à corriger.
# Supabase : le catalogue ne se lit que depuis le serveur (anti-scraping)

La clé publique Supabase est dans le bundle JS : toute table lisible par `anon` est aspirable via l'API REST. Les règles de lecture du catalogue (events, organisateurs, sous_events, collections, mesures…) exigent `public.is_upcomi_web_server()`, vrai seulement si la requête porte l'en-tête `x-upcomi-server-key` (= `SUPABASE_SERVER_READ_KEY`, envoyé par `src/lib/supabase/server.ts`, jamais exposé au navigateur). Donc : pas de lecture du catalogue avec `@/lib/supabase/client` (passer par une server action bornée), et toute nouvelle table publique reçoit une policy `using ((select public.is_upcomi_web_server()))`, pas `using (true)`.

# Performance : règles à respecter pour que l'app reste rapide

Chaque requête Supabase coûte un aller-retour réseau : c'est le nombre d'allers-retours **en série** qui fait la lenteur, pas la taille des tables.

- **Région** : les fonctions Vercel tournent à Paris (`cdg1`, `vercel.json`), à côté de Supabase (eu-west-3). Ne pas changer l'un sans l'autre.
- **Pas de cascade** : les lectures indépendantes partent ensemble (`Promise.all`). Une lecture qui ne dépend que de l'id ne doit pas attendre une autre lecture. Démarrer tôt ce qui ne sert qu'à l'assemblage final (cf. collections de la home).
- **Ne charger que ce que la vue affiche** : une page à onglets charge l'onglet actif, pas tous (cf. `/admin`). Pour un total, `select("id", { count: "exact", head: true })`, jamais rapatrier les lignes pour les compter. `select` des seules colonnes utiles quand la liste est grande.
- **Une lecture partagée = `cache()`** de React (layout + `generateMetadata` + page, contrôle admin, flags) : une seule requête par rendu (cf. `src/app/event/[slug]/get-event.ts`).
- **Retour visuel immédiat** : toute route dynamique ouverte depuis un lien a un `loading.tsx` ou un `<Suspense>` autour de ce qui est lent. Si la page peut répondre 404/redirection, le faire dans un `layout.tsx` au-dessus du `loading.tsx` (sinon le statut HTTP est figé à 200 par le streaming).
- **Auth** : dans `proxy.ts`, `getClaims()` (vérification locale) et non `getUser()` (aller-retour réseau à chaque requête).
- **Pas de boucle d'appels** : pas d'`await` dans une boucle, pas une requête (ou une URL signée) par élément — lire par lots (`.in()`, `createSignedUrls`).
- **Index** : toute colonne filtrée à chaque ouverture de page (`slug`, `event_id`, `user_id`…) a un index ; l'ajouter dans la migration qui introduit la lecture.
- **Alerte** : les clients serveur loguent `[supabase] Requête lente (… ms)` au-delà de 300 ms. C'est à investiguer dans les logs Vercel.
