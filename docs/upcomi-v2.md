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

Ordre de traitement. Les deux socles sont sur le chemin critique.

```
feat/socle-ui               nav, tokens
feat/socle-data             profils publics + entité organisateur     ← bloquant
   ↓ puis parallélisables :
feat/recherche
feat/inscription-publique                                             ← prioritaire
feat/calendrier-inscriptions                                          ← EN COURS
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
