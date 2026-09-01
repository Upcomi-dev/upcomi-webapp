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

`.env.local` (gitignoré) pointe sur la base de **prod**. Le garde-fou principal :

> **Ne pas mettre la vraie clé `service_role` en local.** Une valeur factice
> non vide suffit. Avec la seule clé publique, le code local est enfermé dans
> les mêmes RLS que n'importe quelle utilisatrice — le pire qu'il puisse faire
> est ce qu'elle ferait depuis son navigateur.

Vérifié : avec une clé secrète factice, l'app répond 200 et s'affiche
normalement. C'est la variable *absente* qui provoque une 500
(`createAdminClient()` lève à la construction) ; une valeur fausse échoue à
l'appel et `isEventProposalFeatureEnabled()` l'attrape pour retourner `false`.

Ce qu'on perd avec la clé factice, et c'est tout : les flags lisent `false`
(lien « Proposer un événement » masqué), `/admin` et `/proposer-un-evenement`
ne fonctionnent pas, le proxy d'images ne sert plus les images — laisser
`NEXT_PUBLIC_SITE_URL` vide fait alors résoudre les images vers `app.upcomi.cc`.

Autres garde-fous : utiliser un compte de test plutôt qu'un compte réel ; ne
jamais coller de SQL « pour voir » dans le SQL Editor de la prod (les `select`
sont sans danger, tout le reste mérite un backup préalable).

```bash
npm run dev
```

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
de profil bloquante » à un parcours unique en cinq étapes, repris du prototype :

```
méthode → identité + genre → ville/niveau/pratiques → événements recommandés → confirmation
```

Fichiers : `src/components/auth/signup-wizard.tsx` (le parcours),
`src/components/auth/recommended-events-picker.tsx` (l'étape recommandations),
`src/lib/profile-mutations.ts` (les écritures, partagées avec la page profil).
`src/components/auth/signup-form.tsx` est supprimé, remplacé par le parcours.

### Migration

`supabase/migrations/20260901103000_onboarding_v2.sql` :

- `users.genre`, texte nullable, sans contrainte `check` — la liste de l'UI est
  amenée à bouger et la contraindre coûterait une migration non additive à
  chaque évolution.
- `user_recommended_events` (`user_id`, `event_id`, `created_at`), avec RLS,
  `revoke`/`grant` et les trois policies dans le même fichier.

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
- **Le profil est enregistré dès l'étape 3**, le drapeau `onboarding_completed`
  seulement à la fin : une interruption à l'étape « recommandations » ne perd
  rien.

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
