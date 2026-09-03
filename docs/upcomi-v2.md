# Upcomi V2 — plan de chantier

Document de référence pour la refonte V2 : découpage en briques, stratégie de
branches, règles de base de données, et fonctionnement de l'environnement local.

Le prototype de référence est le dépôt `upcomi-clone` (HTML/CSS/JS statique,
données mock). Il n'est **jamais** fusionné dans ce dépôt : c'est un cahier des
charges, pas du code source. Son état validé est figé par le tag `spec-v1`.

---

## 1. Stratégie de branches

Flux retenu (décision du lead) :

```
feat/<brique>  →  preprod  →  main  →  prod
```

- Les branches `feat/*` partent de `preprod`, jamais de `main`.
- `preprod` est déployée en continu et sert à valider en conditions réelles.
- La livraison se fait en mergeant `preprod` dans `main`. `scripts/deploy.sh`
  refuse de tourner ailleurs que sur `main`.

**Point à clarifier avec le lead** : quand `preprod` part dans `main`, on livre
*tout* ce qu'elle contient d'un coup. Si l'intention était de livrer brique par
brique, il faut cherry-picker plutôt que merger `preprod` en entier.

**Correctif urgent** : si un patch est appliqué directement sur `main`, il faut
remerger `main` dans `preprod` ensuite, sinon il est perdu au prochain batch.

### Feature flags

Merger dans `main` déclenche le déploiement. Le flag découple donc « le code est
en prod » de « l'utilisatrice le voit ». Table `app_features`, lue par
`src/lib/features.ts`.

Décision : on n'refactore pas le système de flags pour l'instant. Ils servent
uniquement à brancher les boutons vers les nouvelles pages.

> Limite connue : `isEventProposalFeatureEnabled()` est codée en dur, une
> fonction par flag. Au-delà de deux ou trois briques flaguées, il faudra un
> `isFeatureEnabled(key)` générique et un écran d'interrupteurs dans `/admin`.

---

## 2. Découpage en briques

### 2.1 Priorisation actuelle (arbitrage du 2026-09-01)

Dépriorisé pour l'instant : refonte de la navigation (nav desktop + barre app
mobile), recherche V2 (filtres avancés), inscription publique (voir qui est
inscrit, statut public). **Non tranché** : le parcours « je suis inscrite → 
partager », et l'évolution de « Mes évènements » — à confirmer avant de les
programmer ou de les exclure.

```
feat/calendrier-inscriptions   (T1 — EN COURS, terminé côté code)
feat/onboarding-v2             (T1 — nouvelles colonnes sur `users`, additif)
feat/dates-cles                (T1)
feat/mesures-inclusion         (T1)
feat/evenements-similaires     (T3 — gratuite, casable ici ou avant)
feat/score-adequation          (T2 — sa propre petite migration)
   ↓ bloquant, seule :
feat/socle-data                (profils publics consultables + entité organisateur)
   ↓
feat/organisateur-enrichi      (T3, suite)
feat/social                    (T4 — suivre, profils)
```

Les cinq premières briques sont parallélisables entre elles dès maintenant.
`feat/socle-data` reste le seul verrou du plan, mais il n'intervient qu'avant
la suite de T3 et tout T4 — largement repoussé par rapport à l'ordonnancement
initial (2.2), ce qui laisse plusieurs semaines de marge avant d'y toucher.

Détail par lot :

- **T1 — Fiche évènement (logistique) + Onboarding V2** : dates clés, mesures
  d'inclusion (catalogue en 4 groupes + suggestion), évolution UI de la page
  évènement au fil de l'eau (pas une refonte de nav), onboarding V2. Aucune
  dépendance entre elles ni avec le reste du plan.
- **T2 — Score d'adéquation** : questionnaire + calcul de compatibilité
  niveau/utilisatrice. Migration dédiée (catalogue de questions de
  compatibilité + réponses), indépendante de T1.
- **T3 — Plus d'infos sur l'évènement** : évènements similaires (zéro
  migration, `collections`/`collection_events` existent déjà) ; bloc
  organisateur enrichi, qui **dépend de `feat/socle-data`** — `events.organisateur`
  est du texte libre aujourd'hui, créer la vraie entité et dédupliquer est le
  chantier le plus délicat du plan (migration de données, pas juste additive).
- **T4 — Social** : suivre, profils publics. **Dépend de `feat/socle-data`** —
  `users` existe mais aucune policy ne permet aujourd'hui à quelqu'un de lire
  le profil d'une autre personne ; à ouvrir en RLS avant le reste de T4.

### 2.2 Ordonnancement de fond (référence, hors urgence court terme)

Ordre par dépendances techniques pures, indépendant des priorités produit du
moment. Utile pour resituer une brique dépriorisée quand elle reviendra à
l'ordre du jour.

```
feat/socle-ui               nav, tokens
feat/socle-data             profils publics + entité organisateur     ← bloquant
   ↓ puis parallélisables :
feat/recherche
feat/inscription-publique
feat/calendrier-inscriptions
feat/faq
feat/dates-cles
feat/y-aller
feat/mesures-inclusion
feat/evenements-similaires
   ↓ dépend de socle-data :
feat/organisateur-enrichi
   ↓ dépend d'inscription-publique :
feat/score-adequation
feat/partage-experience     parcours retour + tags + récits + affichage
feat/social                 profil, suivre
```

Notes :

- **`feat/evenements-similaires` est quasi gratuite** : les tables `collections`
  et `collection_events` existent déjà, c'est une requête, zéro migration.
- **`feat/partage-experience`** regroupe le parcours de contribution et les blocs
  tags/récits : même flux producteur → données → affichage, une seule migration.
  La **saisie** d'un récit est finalement avancée dans `feat/onboarding-v2`
  (§7) ; il reste à cette brique l'affichage, les tags et le parcours retour.
- La brique « fiche-communauté » a été supprimée (doublon).
- « Événement V2 » (page parallèle branchée à la fin) a été abandonné.

### État de la base pour ces briques

Ce qui existe **déjà** et qu'il ne faut pas recréer :

- `events.dateInscription`, `inscriptions_ouvertes`, `clotureInscription`
- `favourite_events` avec un booléen `participates`
- Une table **`users`** (`uid`, `email`, `name`, `surname`, `ville`, `pref1`,
  `pref2`), lue à neuf endroits. Le profil est hybride : cette table **plus**
  `auth.users.user_metadata`, fusionnés par `buildInitialUserProfile()`.
- `collections` / `collection_events`
- Les fonctions `get_popular_events()` et `get_event_favourite_counts()`

Ce qui **n'existe pas** :

- Aucune entité organisateur : `events.organisateur` est du **texte libre**.
  L'enrichir suppose de créer les entités, dédoublonner, rattacher — c'est de la
  migration de données, le chantier le plus délicat de la V2.
- Le cycle favoris / inscrite / inscrite-publique ne rentre pas dans le booléen
  `participates`. Ajouter une colonne `status`, backfiller, garder les deux
  synchronisés le temps de migrer les huit points d'appel.

---

## 3. Règles de base de données

Il n'y a **qu'une seule base** (la prod). Pas de staging — décision assumée. Les
règles ci-dessous sont ce qui rend cette situation tenable.

### Additif uniquement

`ADD COLUMN` nullable, nouvelle table. **Jamais** `RENAME`, `DROP` ou changement
de type tant que l'ancien champ est utilisé. Conséquences :

- L'ancien code continue de tourner face au nouveau schéma → les branches
  restent indépendantes quel que soit l'ordre d'application.
- Un fichier de migration par branche → jamais de conflit git (append-only).

Corollaire : **les clés étrangères vont dans les tables enfants**
(`event_faqs.event_id`), pas sur `events`. La table `events` n'est donc modifiée
par aucune brique.

### RLS et grants dans la même migration

Créer une table dans le schéma `public`, c'est **publier une API HTTP
immédiatement interrogeable** avec la clé publique. Le feature flag protège
l'UI, pas la base.

Toute migration créant une table doit donc contenir, dans le même fichier :

```sql
alter table public.<table> enable row level security;
revoke all on table public.<table> from anon, authenticated;
grant select, insert, update on table public.<table> to authenticated;
create policy ... ;
```

C'est le motif déjà suivi par 4 des 5 migrations existantes qui créent une
table. Particulièrement critique pour les récits (contenu identifiant) et les
réponses au questionnaire de compatibilité (données personnelles).

### Ordre d'application

```
migration en base  →  merge du code  →  activation du flag
```

Toujours la base avant le code : une colonne inutilisée ne gêne personne, du
code cherchant une table absente plante.

Il n'y a **aucune CI** dans ce projet — les migrations sont appliquées à la
main. Tenir une checklist de ce qui est déjà passé en prod.

### Migrations touchant des données existantes

Les backfills (profils, dédoublonnage organisateurs, `participates` → `status`)
sont le seul geste vraiment risqué. Pour ceux-là uniquement : backup pris juste
avant, et écriture rejouable sans dégât (`ON CONFLICT DO NOTHING`,
`UPDATE ... WHERE colonne IS NULL`).

---

## 4. Comment l'app parle à Supabase

Il n'y a **pas de backend Upcomi**. Supabase = Postgres + une API HTTP générée
devant. C'est la base elle-même qui filtre, via les policies RLS.

Trois clients, qui ne diffèrent que par la clé présentée :

| Fichier | Où | Clé | Soumis aux RLS |
|---|---|---|---|
| `src/lib/supabase/client.ts` | navigateur | publique | oui |
| `src/lib/supabase/server.ts` | serveur + cookie de session | publique + session | oui, en tant que l'utilisatrice |
| `src/lib/supabase/admin.ts` | serveur | **secrète** | **non — passe-droit total** |

`src/proxy.ts` (l'ancien `middleware`, renommé dans Next 16) rafraîchit la
session avant chaque requête.

| Objet | Table | Client |
|---|---|---|
| Événements | `events` | server / client |
| Favoris & inscriptions | `favourite_events` | client (contexte React) |
| Profil | `users` + `user_metadata` | server |
| Collections | `collections`, `collection_events` | server |
| Statut admin | `admin_users` | server |
| Feature flags | `app_features` | **admin** (revoke anon+authenticated) |
| Propositions d'événement | `event_submission_contacts` | admin |
| Feedback | `feedback_entries` | server |
| Images | bucket storage via `/api/storage` | admin |

---

## 5. Environnement local

`.env.local` (gitignoré) pointe sur un stack Supabase **local**, pas sur la
prod. Le stack tourne dans Docker via Colima ; l'ancien contenu, qui visait la
base de production, est conservé dans `.env.local.backup`.

### Démarrer

```bash
colima start
supabase start      # depuis la racine du dépôt
npm run dev
```

`supabase start` lit `supabase/config.toml` et applique les migrations de
`supabase/migrations/` au premier démarrage. `supabase stop` arrête le stack
(les données survivent) ; `supabase status` réaffiche les URLs et les clés.

⚠️ **Les migrations versionnées ne décrivent pas le socle de la base.** Elles
ne créent que six tables (`collections`, `collection_events`, `admin_users`,
`app_features`, `feedback_entries`, `event_submission_contacts`). Les vingt
autres — `users`, `events`, `organisateurs`, `notifications`, `user_public`,
`friendships`, `sous_events`… — n'ont jamais été décrites par une migration :
elles viennent de FlutterFlow et du dashboard Supabase. Sur un volume Docker
vierge, `supabase start` s'arrête donc en erreur dès la première migration V2
(`alter table public.users` sur une table absente). Voir « Reconstruire la base
locale » plus bas.

| Service | URL |
|---|---|
| API (REST, Auth, Storage) | http://127.0.0.1:54321 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio (SQL Editor, table editor) | http://127.0.0.1:54323 |
| Mailpit (tous les mails sortants) | http://127.0.0.1:54324 |

Les mails d'authentification ne partent nulle part : ils atterrissent dans
Mailpit, où l'on récupère les liens de confirmation et de connexion.

### La clé secrète locale est sans danger

`SUPABASE_SECRET_KEY` contient la vraie `service_role` **du stack local**.
C'est une clé de démo, identique sur toutes les installations Supabase CLI, et
elle n'ouvre que la base Postgres qui tourne dans Docker. Elle n'a aucune
valeur en dehors de la machine.

Conséquence : plus rien n'est bridé en local. Les feature flags se lisent
vraiment, `/admin` et `/proposer-un-evenement` fonctionnent, le proxy d'images
sert les images. Les limitations décrites dans les versions précédentes de ce
document (clé factice, flags à `false`) n'ont plus cours.

### Contenu de la base locale

Environ 93 évènements seedés, et **0 `sous_events`** — de quoi parcourir les
listes et les fiches, mais les écrans qui dépendent des sous-évènements
apparaissent vides. Les créer à la main dans Studio ou par un seed est le seul
moyen de les tester.

### Appliquer une migration en local

Écrire le fichier dans `supabase/migrations/`, en respectant le format
`AAAAMMJJHHMMSS_description.sql`, puis :

```bash
supabase migration up
```

`supabase db reset` rejoue toute l'historique des migrations — mais, pour la
raison ci-dessus, **il ne reconstruit plus une base exploitable** : il vide le
volume puis échoue en cours de route. Ne pas le lancer sans avoir de quoi
recréer le socle.

Une migration n'est poussée en prod qu'après avoir été jouée ici. Les règles de
la section 3 restent la référence pour ce qu'une migration a le droit de faire.

### Reconstruire la base locale

Le schéma de production n'est **pas versionné**. Il l'a été un temps, sous la
forme d'un `supabase db dump` déposé dans `supabase/migrations/` : ce dump
embarquait les clés d'API du projet en clair, cachées dans la définition des
webhooks DB, et il a été retiré du dépôt.

La photo du schéma est conservée hors dépôt, expurgée de ses clés et de ses
webhooks :

```
~/Sites/upcomi-db-baseline/schema_prod_2026-09-01.sql
```

Le seed (`supabase/seed.sql`) n'est pas versionné non plus : il ne sert qu'au
développement local et reste propre à chaque poste.

Pour repartir d'une base neuve, appliquer la photo à la main sur le stack local
avant de jouer les migrations V2 :

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -f ~/Sites/upcomi-db-baseline/schema_prod_2026-09-01.sql
supabase migration up
```

### Ce qui reste vrai vis-à-vis de la prod

La prod n'a plus de raison d'être touchée depuis le poste de dev. Si l'on y
retourne malgré tout — `.env.local.backup`, Studio distant, `supabase link` —
les garde-fous d'origine tiennent toujours :

- ne pas mettre la vraie clé `service_role` de prod dans un `.env` local ;
- utiliser un compte de test plutôt qu'un compte réel ;
- ne jamais coller de SQL « pour voir » dans le SQL Editor de la prod (les
  `select` sont sans danger, tout le reste mérite un backup préalable).

> `pnpm` n'est pas installé sur la machine de dev alors que le dépôt a un
> `pnpm-lock.yaml`. Les dépendances ont été installées avec `npm` via
> `package-lock.json`. Rester sur le même gestionnaire que l'équipe.

---

## 6. Brique en cours — `feat/calendrier-inscriptions`

Livré : page `/calendrier-des-inscriptions`, vue calendrier + vue liste,
filtres (toutes / populaires / enregistrés), pastilles de statut d'ouverture,
gate de connexion, entrée dans la TopNav. Aucune migration.

Fichiers : `src/lib/utils/registration-calendar.ts`,
`src/app/calendrier-des-inscriptions/`, plus le lien dans
`src/components/layout/top-nav-client.tsx`.

Décisions prises :

- Le `popular` du proto est branché sur `get_popular_events()`, **plafonné à 10**
  événements. Le filtre « Les plus populaires » n'affichera jamais plus.
- Les inscriptions déjà closes (`clotureInscription` passée) sont exclues : le
  proto ne modélise pas la clôture, mais sans ce filtre un événement fermé
  s'afficherait « Ouvertes — places disponibles ». `inscriptions_ouvertes` n'est
  pas utilisé, sa sémantique est ambiguë (pas-encore-ouvert vs fermé).
- Le calendrier s'ouvre sur le mois courant, fidèlement au proto.
- Le système de « lanes » du proto n'a pas été retenu : chaque case liste
  simplement ses ouvertures.

**Reporté** : le bouton « Me prévenir » (rappel mail à l'ouverture), qui exige
une table `registration_reminders`. C'est le bénéfice central de la page selon
le proto — à traiter dans sa propre brique juste après.

---

## 7. Brique `feat/onboarding-v2`

Le parcours d'inscription passe du couple « formulaire de compte » + « modale
de profil bloquante » à un parcours unique en six étapes, repris du prototype :

```
méthode → identité + genre → ville/niveau/pratiques → événements recommandés → récit → confirmation
```

Fichiers : `src/components/auth/signup-wizard.tsx` (le parcours),
`src/components/auth/recommended-events-picker.tsx` (l'étape recommandations),
`src/components/auth/event-story-form.tsx` (l'étape récit),
`src/lib/profile-mutations.ts` (les écritures, partagées avec la page profil).
`src/components/auth/signup-form.tsx` est supprimé, remplacé par le parcours.

### Le gate, premier écran

`src/components/auth/auth-gate.tsx` reprend le gate du prototype : ce qu'on
gagne à avoir un compte, puis « Créer un compte » / « Me connecter ». C'est une
vue de la modale d'auth (`view: "gate"`), pas une étape du parcours — il précède
le choix entre inscription et connexion, et n'a donc pas de pastille.

C'est désormais l'écran d'entrée **par défaut** : le lien de la barre de
navigation et les gestes réservés aux membres (mettre en favori) l'ouvrent, avec
le geste en titre comme dans le proto. On n'arrive directement sur un formulaire
que si l'intention est explicite : routes `/login` et `/signup`.

Les trois bénéfices affichés sont réécrits par rapport au proto : « accède à
tous les retours de la communauté » promettait une fonctionnalité qui n'existe
pas encore ici.

### Migration

`supabase/migrations/20260901103000_onboarding_v2.sql` :

- `users.genre`, texte nullable, sans contrainte `check` — la liste de l'UI est
  amenée à bouger et la contraindre coûterait une migration non additive à
  chaque évolution.
- `user_recommended_events` (`user_id`, `event_id`, `created_at`), avec RLS,
  `revoke`/`grant` et les trois policies dans le même fichier.

`supabase/migrations/20260903001000_event_stories.sql` :

- `user_event_stories` (`user_id`, `event_id`, `story_url`, `story`,
  `created_at`, `updated_at`), clé primaire sur le couple, RLS et grants dans le
  même fichier — un récit est du contenu identifiant, la table ne doit pas
  naître publique le temps que le reste suive.
- Trois `check` : au moins un des deux champs rempli, `story_url` en
  `http(s)://` et sous 2048 caractères, `story` sous 1500. Les longueurs sont
  doublées côté UI (`EVENT_STORY_MAX_LENGTH`, `EVENT_STORY_URL_MAX_LENGTH`).
- `get_events_with_stories(bigint[])`, `security definer` sur le modèle de
  `get_event_favourite_counts()` : la policy de `select` ne laisse voir que ses
  propres récits, et le parcours a besoin de savoir lesquels des événements
  choisis sont **déjà couverts**, par n'importe qui. Elle ne renvoie que des
  identifiants d'événements — jamais un récit ni son autrice — et n'est
  exécutable que par `authenticated`.

**À appliquer en base avant de merger le code** : `layout.tsx`, `/profil` et la
modale profil sélectionnent désormais la colonne `genre`. Tant qu'elle n'existe
pas, la requête échoue silencieusement et le profil remonte vide.

### Décisions prises

- **Genre facultatif**, et volontairement hors de `isUserProfileComplete()` :
  l'exiger reviendrait à bloquer le parcours sur une donnée sensible. Ne rien
  répondre reste distinct de « Je préfère ne pas répondre ».
- **Table dédiée pour les recommandations**, plutôt qu'un drapeau sur
  `favourite_events` : « je recommande à la communauté » n'est ni « favori » ni
  « j'y participe », et les trois doivent pouvoir diverger. C'est le seul écart
  au périmètre « nouvelles colonnes sur `users` » annoncé en 2.1.
- **Niveaux inchangés** (`Debutant`/`Intermediaire`/`Confirme`/`Competition`) :
  le proto propose `Expert`, l'aligner imposerait un backfill de `users.pref2`.
- **Le nom reste obligatoire**, contrairement au proto : `isUserProfileComplete()`
  l'exige déjà, et un nom vide laisserait la modale de reprise s'ouvrir à
  chaque connexion.
- **L'étape « identité » est tenue courte** : prénom, nom, mot de passe et sa
  confirmation, puis la case CGU. Pas de confirmation d'email (le champ est
  saisi une seule fois à l'étape précédente), et le genre est passé à l'étape
  « profil », à laquelle il appartient. Les règles de mot de passe sont un
  rappel discret sous le champ, sans encadré ni titre — la version encadrée
  prenait plus de place que le formulaire.
- **Le profil est enregistré dès l'étape 3**, le drapeau `onboarding_completed`
  seulement à la fin : une interruption à l'étape « recommandations » ne perd
  rien. Les recommandations suivent la même règle et sont écrites en quittant
  l'étape 4, avant la saisie des récits.
- **Les récits arrivent avec l'onboarding**, alors qu'ils étaient prévus dans
  `feat/partage-experience` (§2.2) : la saisie est ici, l'affichage reste à
  faire avec le reste de la brique partage. En attendant, la table n'est
  lisible que par son autrice — pas de `select` public tant qu'il n'y a rien
  pour le rendre.
- **Un récit est d'abord un lien**, comme dans le proto (`review.js`, étape
  « links », que `signup.js` rouvre en `startStep: 1` juste après les
  recommandations) : on colle l'adresse du récit déjà publié sur Instagram,
  Strava ou un blog plutôt que de le retaper. Le texte libre est gardé sous le
  lien, en second — la colonne `story` existe et servira à l'extrait affiché
  sur la fiche.
- **Un seul récit demandé**, pas un par événement : le proto ne propose que
  `recommended[0]`. On garde ce principe en sautant les événements déjà
  couverts — l'étape porte sur le **premier événement recommandé sans récit**,
  et disparaît entièrement (pastille comprise) s'il n'y en a aucun, faute de
  recommandation ou parce que toutes ont déjà leur récit.
- **« Ajouter → » valide même les champs vides**, sans second bouton
  « Passer » : le récit est facultatif de bout en bout et le proto note qu'un
  bouton suffit alors. Rien n'est écrit si les deux champs sont vides.
- **Le lien est complété s'il manque le protocole** (`instagram.com/p/…` →
  `https://…`), repris du proto ; une adresse qui reste invalide affiche une
  erreur au lieu d'être écrite.

### Google, et la reprise du parcours

`Continuer avec Google` sort de l'application le temps de l'aller-retour OAuth :
l'état du parcours est perdu. Au retour, le garde d'onboarding du layout
(`hasCompletedOnboarding()`) rouvre le parcours **à l'étape 3**, le compte et
l'identité étant déjà connus. C'est le même mécanisme qui rattrape une session
interrompue en cours de route. `OnboardingModal` n'est donc plus un formulaire
mais un hôte pour le parcours, monté avec `startStep="profil"`.

Le prototype propose aussi `Continuer avec Strava` : non repris, il n'y a pas de
provider Strava configuré côté Supabase.

Si le projet Supabase venait à exiger une confirmation par email, `signUp`
renverrait un compte sans session : le parcours affiche alors un écran « vérifie
ta boîte mail » au lieu de continuer.

---

## 8. Brique — `feat/fiche-evenement-v2` (dates clés + mesures d'inclusion + UI)

Les trois lots T1 restants de la fiche évènement (`feat/dates-cles`,
`feat/mesures-inclusion`, et l'évolution UI « au fil de l'eau ») sont traités
dans **une seule branche** : ils réécrivent tous les trois
`src/app/event/[slug]/page.tsx`: les séparer garantissait des conflits sur le
même fichier sans rien découpler.

Hors périmètre, comme convenu : le bloc « qui est intéressé » (avatars,
compteur d'intéressé·es, feuille de personnes) et le partage de récit — une
branche plus tard. Le composant `FavoriteCTA` existant tient la place.

### Ce qui est livré

**Dates clés** — bloc « Pour se préparer » : timeline verticale ouverture des
inscriptions → clôture → départ → arrivée, avec le lieu de départ et la gare la
plus proche rattachés au point « Départ ».

- `src/lib/utils/event-key-dates.ts` (construction des points, lien Google
  Agenda), `src/components/events/event-key-dates.tsx`,
  `src/components/events/key-date-reminder-button.tsx`.
- **Aucune migration** : tout vient de `dateInscription`,
  `clotureInscription`, `dateEvent`, `dateFin`, `villeDepart`, `distance`.
- La **clôture des inscriptions** est un ajout au proto (qui ne la modélise
  pas) : la colonne existe et c'est une date de préparation.
- « M'envoyer un rappel » est un **habillage du favori**, comme dans le proto :
  pas de table `registration_reminders`, pas d'envoi d'e-mail. Le vrai rappel
  reste la brique reportée du calendrier des inscriptions.
- Le rythme « X km par jour » n'est affiché que si `events.distance` porte
  **une seule** valeur : « 250 / 500 / 800 km » décrit trois parcours au choix,
  aucun ne vaut pour l'évènement.

**Accès en train** — le proto porte l'information par un booléen saisi à la
main (`trainAccess`) et un référentiel de gares. Côté webapp, ni l'un ni
l'autre : c'est la **distance à la gare la plus proche** qui en tient lieu,
calculée au rendu serveur depuis `events.latitude/longitude`.

- `src/lib/data/gares.json` (extrait statique de data.sncf.com, dédoublonné par
  (nom, commune), 2962 gares, ~200 ko) et `src/lib/utils/stations.ts`.
- Rien ne s'affiche au-delà de **30 km** (`MAX_STATION_DISTANCE_KM`) : plus
  loin, ce n'est plus une information d'accès, et le référentiel est français.

**Mesures d'inclusion** — bloc « Ce que tu peux attendre, en tant que femme ou
personne de minorité de genre », en sous-partie de « Qui organise ». Toujours
affiché, même vide.

- Migration `20260902101500_inclusion_measures.sql` : `inclusion_measures`
  (catalogue, 20 mesures seedées depuis le guide inclusivité) et
  `event_inclusion_measures` (liaison). La clé étrangère est portée par la
  table enfant : `events` n'est pas modifiée.
- **Lecture publique** (`grant select to anon, authenticated` + policy
  `using (true)`) : la fiche est rendue avec la clé publique et consultable
  sans compte. Écriture réservée aux admins.
- **Le rattachement des mesures se fait en SQL** pour l'instant — pas d'écran
  de saisie dans `/admin`. Tant que rien n'est saisi, le bloc affiche son état
  vide, qui est une information en soi.
- Le nom d'icône vient de la base mais est résolu par un **dictionnaire
  explicite** côté code (`MEASURE_ICONS`) : jamais d'import dynamique par clé.
- « Signaler une mesure » est un `mailto:` vers contact@upcomi.cc, comme dans
  le proto — pas de formulaire.

**Évolution UI de la fiche** — restructuration fidèle au proto :

- Titre **dans** le hero, avec les repères (durée, distance · dénivelé, type de
  vélo) et le badge mixité juste au-dessus, dans le flux.
- Ligne de synthèse à icônes sous l'image : type · date · lieu · prix. Favori
  et inscription en sont retirés (doublon avec le bloc d'intérêt juste en
  dessous et avec le bloc d'inscription).
- Ordre de lecture : synthèse → intérêt → description → parcours → dates clés →
  qui organise (+ mesures + leurs autres évènements).
- Le prix d'un parcours **mène à l'inscription** quand `events.URL` existe.
- La carte « Détails » de la colonne de droite est supprimée : elle répétait la
  ligne de synthèse. La colonne ne porte plus que le bloc d'inscription.

### Cartes d'évènement (même branche)

La charte de la carte a suivi celle de la fiche : le proto n'a **qu'une seule**
carte, une tuile photo pleine, déclinée en deux tailles. `EventCard` avait trois
variantes divergentes, dont deux répétaient le titre (une fois sur l'image, une
fois dans un panneau blanc en dessous).

- `carousel` (accueil, aperçu carte, panneau de détail) et `list` (résultats de
  recherche) sont désormais **la même tuile** : photo en fond, dégradé, cœur en
  haut à droite, repères (mixité, durée, distance · dénivelé) puis titre serif
  blanc et « ville · date ». Seules les dimensions changent.
- `grid` a disparu. « Leurs autres évènements » passe à une nouvelle variante
  **`compact`** (miniature + nom + date/lieu, en slider horizontal), reprise du
  `.agenda-row` du proto : ces évènements sont une sortie possible depuis la
  fiche, ils ne doivent pas concurrencer celui qu'on lit. Même traitement dans
  le panneau de détail de la carte.
- Le badge **mixité choisie** apparaît enfin sur les cartes : la prop `mint`
  était passée partout mais n'était pas lue.
- Les repères sont calculés par `src/lib/events/facts.ts`, partagé entre la
  carte et le visuel de la fiche — c'est ce qui garantit qu'on retrouve en haut
  de fiche ce sur quoi on vient de filtrer.

**Dénivelé** : il vit sur `sous_events`, pas sur `events`. `fetchEventMaxElevations`
(`src/lib/events/elevations.ts`) le remonte en une requête à deux colonnes sur
les seuls évènements listés, découpée par paquets de 200 identifiants. Pas de
fonction SQL ni de migration : à ce volume elle n'apporterait rien. Le champ
voyage dans `MapEvent.maxElevation`, **optionnel** — il reste absent partout où
il n'a pas été demandé.

> Les collections manuelles font leur propre requête d'évènements (elles peuvent
> porter un évènement hors filtres ou sans coordonnées) : elles ont donc leur
> propre lecture du dénivelé. Oublier ce second appel laisse les carrousels de
> l'accueil sans dénivelé alors que la carte l'affiche.

> `src/components/layout/mobile-bottom-sheet.tsx` n'est référencé nulle part.
> Il a été mis à jour par cohérence, mais c'est du code mort à supprimer.

### Écarts relevés en comparant au proto, et corrigés

Comparaison faite sur les styles calculés plutôt qu'à l'œil (`localhost:3000`
contre `localhost:8080`), mobile et desktop :

- **Desktop, structure** : dans le proto le hero et la ligne de synthèse sont
  **pleine largeur**, au-dessus des deux colonnes ; seul le contenu en dessous
  se partage entre la colonne de lecture et le bloc d'inscription. La fiche
  mettait le hero *dans* la colonne de gauche, qui le réduisait à 540 px.
  Corrigé, et les largeurs sont désormais celles du proto : conteneur 1040,
  colonnes 680 / 280, gouttière 32.
- Titre du hero : `font-weight` 400 → **700**.
- Titres de section (« Pour se préparer », « Qui organise ? ») : 20 → **22 px**.
- Pastille de la timeline : ocre `--orange` → **corail**, c'est-à-dire
  l'`--upcomi-orange` du proto (`#eb5f3b`, le `--coral` de la webapp).
- « M'envoyer un rappel », « Ajouter à mon calendrier » et « Voir le site »
  étaient gris : ce sont des **actions**, pas des libellés. Elles reprennent le
  `.btn-secondary.small` du proto, factorisé dans l'utilitaire
  `.btn-outline-coral` (`globals.css`).
- Liseré du bloc mesures : `#315643` → **`#4e9c6b`**, le vert inclusion du proto.
- **Badge mixité** : `MixiteBadge` prend la forme et la typographie des repères
  posés à côté de lui (capitales, 11 px/700, même pastille), en gardant le
  vert — c'est un repère parmi les autres, pas une décoration à part. La carte
  d'évènement, dont les repères sont plus petits, passe sa propre taille.
- Description : 14 → **15 px**.
- Lien retour : c'était une pastille de verre, c'est un simple lien texte
  (13 px, `--muted-foreground`), comme le proto.
- Cartes de parcours : `max-width: 450px`, comme le proto — une ligne
  « nom + prix » n'a pas besoin de toute la colonne.
- Cartes : mois en toutes lettres (« 12 septembre », pas « 12 sept. »), comme
  le proto — la ligne « ville · date » est tronquée si besoin.

### Actions de la fiche

`EventActions` porte la paire du proto : **« M'inscrire » secondaire** et
**« Ça m'intéresse » primaire**. L'inscription part sur le site de
l'organisation — elle ne peut pas être l'engagement demandé en premier.

La paire est répétée aux trois endroits du proto : en haut de fiche (masquée en
desktop, où la colonne de droite fait doublon), dans la colonne de droite en
desktop (boutons empilés, compteur centré), et dans la barre collante en
mobile. Cette dernière reste escamotée tant qu'on n'a pas commencé à lire
(`StickyActionBar`, seuil à 24 px comme le proto) : visible d'emblée, elle
afficherait deux fois la même chose à l'écran.

Le compteur « X personnes intéressées » remplace le `FavoriteCTA` sur la fiche,
qui faisait doublon avec le bouton d'intérêt. `FavoriteCTA` reste utilisé par
le panneau de détail de la carte. Les avatars et la feuille « qui est
intéressé » restent hors périmètre.

Le prix ne figure plus dans le bloc d'action : il est dans la ligne de
synthèse, comme dans le proto.

### Les trois seuls types de bouton

Chaque écran avait sa propre recette de bouton : rayons, hauteurs, tailles de
texte et capitales différentes d'un formulaire à l'autre, et le `Button`
shadcn de `components/ui` n'était utilisé que par `dialog.tsx`.

`globals.css` porte désormais les trois types du proto, sous leurs noms
d'origine : `.btn-primary` (corail plein), `.btn-secondary` (blanc à liseré
corail) et `.btn-tertiary` (texte souligné), plus `.btn-small` en
modificateur. Une seule classe suffit ; la largeur reste au contexte
(`w-full`, `flex-1`).

> **La hauteur est posée en `min-height`, pas en `height`** — deux pièges
> imbriqués, rencontrés sur la colonne de droite de la fiche, où les boutons
> se sont retrouvés à 23 px de haut :
>
> 1. dans une **colonne** flex, `flex-1` pose `flex-basis: 0%` sur la hauteur
>    et écrase le `height` du bouton. `flex-1` n'a de sens qu'en rangée ;
>    `EventActions` bascule sur `w-full` en orientation colonne ;
> 2. un `min-height` posé **à côté** d'un `height` est supprimé par le
>    minifieur, qui le juge redondant : le filet de sécurité disparaissait à
>    la compilation sans rien signaler. Il faut donc l'un *ou* l'autre — et
>    c'est `min-height` qui protège.

Convertis : les actions de la fiche, les soumissions des formulaires
d'authentification, le dialogue de feedback, « Confirmer » et « Effacer tout »
des filtres, la proposition d'évènement, la popin de carte et le panneau de
détail. **Pas** les pastilles de filtre, les bascules et les boutons-icônes :
c'est une autre famille, qui a ses propres règles dans le proto (`.pill`,
`.tag-cell`, `.round-btn`).

### Écarts assumés

- **Compteur d'intéressé·es** : retiré de la fiche — il relève du bloc « qui
  est intéressé ». La requête de comptage sur `favourite_events` a disparu avec
  lui.
- **Tag `bike_type` sur le hero** : le proto n'a que mixité + durée +
  distance · dénivelé. Le type de vélo est une donnée que la webapp possède et
  qui n'apparaîtrait plus nulle part sur la fiche autrement ; gardé en 3ᵉ tag.
- **Organisateur** : le proto affiche une description, Instagram et Strava.
  `events` ne porte aucun de ces champs — ils viendront avec
  `feat/organisateur-enrichi`, qui dépend de `feat/socle-data`.

### Checklist de mise en prod

1. Appliquer `supabase/migrations/20260902101500_inclusion_measures.sql`.
2. Merger le code (aucun feature flag : les blocs sont visibles au déploiement,
   et dégradent proprement — timeline en « --/-- », mesures en état vide).
3. Saisir les rattachements `event_inclusion_measures` évènement par évènement.
