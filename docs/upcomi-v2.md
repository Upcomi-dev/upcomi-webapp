# Upcomi V2 — dossier de passation

Ce document est le point d'entrée unique pour reprendre le chantier V2 : ce
qu'on construit, où en est le code, ce qu'il reste à faire, et comment
travailler sur le projet.

Le prototype de référence est le dépôt `upcomi-clone` (HTML/CSS/JS statique,
données mock). Il n'est **jamais** fusionné ici : c'est un cahier des charges,
pas du code source. Son état validé est figé par le tag `spec-v1`.

---

## 0. En un coup d'œil

> ### ⚠️ Rien de la V2 n'est en production.
> `main` est **42 commits derrière `preprod`**. Tout ce qui est marqué
> « fusionné » ci-dessous l'est dans `preprod` seulement. La première livraison
> sera donc un batch : toutes les migrations d'un coup, et deux policies RLS à
> vérifier avant (§4).

| Chantier | État | Prochaine action |
|---|---|---|
| Inscription & profil | fusionné preprod | livrer |
| Fiche évènement (dates clés, inclusion, UI) | fusionné preprod | livrer + **saisir les mesures** |
| Qui est intéressé | fusionné preprod | livrer, après vérif RLS |
| Avantages membres (code promo) | fusionné preprod | livrer + **saisir les codes** |
| Calendrier des inscriptions | écrit, hors preprod | rebaser, merger |
| Récits d'expérience (affichage) | écrit, hors preprod | rebaser, merger |
| Score d'adéquation | écrit, **divergé** | arbitrer un conflit produit |
| Évènements similaires | maquette | trancher la règle de sélection |
| Fiche organisatrice enrichie | maquette | créer l'écran de saisie |
| Réseau social & profils | maquette | concevoir les notifications |
| Recherche V2 | maquette | migration distance/durée |
| Navigation à 4 espaces | maquette | merger après le calendrier |
| Alertes d'ouverture d'inscription | **non commencé** | tout |
| Inscription publique | **non commencé** | tout |
| Centre de notifications | **non commencé** | tout |

---

## 1. Ce qu'on construit

### Ne pas rater le départ

> **En tant que cycliste**, je veux être prévenue quand les inscriptions d'un
> évènement qui m'attire vont ouvrir, **afin de** ne pas découvrir trois
> semaines trop tard qu'il est complet.

> **En tant que cycliste qui planifie sa saison**, je veux voir en un coup
> d'œil quand s'ouvrent les inscriptions des prochains mois, **afin de** poser
> mes congés et mon budget au bon moment.

### Savoir si c'est pour moi

> **En tant que cycliste qui hésite**, je veux comprendre ce que l'évènement va
> vraiment me demander (dans les jambes, sur plusieurs jours, sur ce terrain),
> **afin de** m'engager sans peur de me retrouver larguée.

> **En tant que débutante**, je veux savoir combien de personnes de mon niveau
> y vont déjà, **afin de** me sentir légitime à m'inscrire.

> **En tant que cycliste qui n'y va pas encore**, je veux savoir sur quoi
> m'entraîner d'ici là, **afin de** transformer « c'est trop pour moi » en
> « j'ai six mois pour m'y préparer ».

### Trouver le bon évènement

> **En tant que cycliste**, je veux chercher par le temps dont je dispose (un
> dimanche, un week-end, une semaine) plutôt que par des filtres techniques,
> **afin de** ne voir que ce qui rentre dans ma vie.

> **En tant que cycliste**, je veux filtrer par une distance qui a du sens pour
> cette durée-là, **afin de** ne pas comparer une sortie à la journée avec un
> raid de cinq jours.

> **En tant que cycliste qui a raté un évènement ou qui hésite**, je veux qu'on
> me propose deux ou trois évènements proches de celui que je regarde, **afin
> de** repartir avec une alternative plutôt qu'avec une déception.

### Faire confiance avant de payer

> **En tant que cycliste**, je veux lire ce qu'ont vécu celles qui y étaient
> l'an dernier, **afin de** me décider sur du vécu et pas sur une plaquette.

> **En tant que participante**, je veux qu'on me demande mon retour au bon
> moment après l'évènement, **afin de** rendre à la communauté ce qu'elle m'a
> donné avant mon inscription.

> **En tant que cycliste**, je veux savoir qui organise — qui elles sont, ce
> qu'elles font le reste de l'année, où les suivre —, **afin de** distinguer un
> collectif engagé d'un simple prestataire.

> **En tant que cycliste concernée par l'accueil**, je veux voir concrètement
> ce qui est prévu pour moi (mixité, accompagnement, matériel, garde
> d'enfants), **afin de** ne pas avoir à écrire un mail pour poser la question.

### Y aller entourée

> **En tant que cycliste**, je veux dire publiquement que je participe, **afin
> d'**attirer d'autres femmes sur le même départ plutôt que d'y aller seule.

> **En tant que cycliste**, je veux voir où vont les personnes que je suis,
> **afin de** caler mon calendrier sur le leur.

> **En tant que membre**, je veux suivre quelqu'un rencontré sur un évènement,
> **afin de** garder le lien jusqu'au prochain.

> **En tant que membre**, je veux choisir qui voit mes inscriptions, **afin de**
> participer à la communauté sans exposer mon agenda à tout le monde.

> **En tant que membre**, je veux être avertie quand quelqu'un me suit ou quand
> un évènement que j'ai repéré bouge, **afin de** revenir sur Upcomi quand il se
> passe quelque chose, pas au hasard.

### Ce qui fait vivre le catalogue

> **En tant qu'organisatrice**, je veux présenter mon collectif et mes
> engagements sur chaque fiche, **afin de** capter des participantes qui
> viennent pour ce que je défends.

> **En tant qu'organisatrice**, je veux offrir un avantage aux membres Upcomi
> (code promo, places réservées, inscription anticipée), **afin de** remplir
> plus vite auprès du bon public.

> **En tant que membre Upcomi**, je veux voir l'avantage auquel mon compte me
> donne droit au moment où je m'inscris, **afin de** comprendre ce que
> l'adhésion me rapporte.

> **En tant qu'équipe Upcomi**, je veux renseigner moi-même les mesures
> d'inclusion, les avantages et les fiches d'organisatrices sans passer par un
> développeur, **afin que** le catalogue s'enrichisse au rythme du terrain et
> pas au rythme des mises en production.

> **En tant qu'équipe Upcomi**, je veux relire les récits avant publication,
> **afin de** garantir le ton et la sécurité de l'espace.

### Trois arbitrages produit en attente

1. **Évènements similaires** : sélection éditoriale par l'équipe, ou proposition
   automatique par proximité ? Deux promesses différentes, deux coûts
   différents.
2. **Suivre une organisatrice vs suivre une personne** : les deux abonnements
   cohabiteraient sans qu'on ait décidé ce que chacun veut dire pour la
   membre.
3. **« Mes évènements »** : la page s'appelle encore « Mes favoris » et ne
   distingue pas ce qui m'intéresse de ce à quoi je suis inscrite. À redéfinir
   avant l'inscription publique.

---

## 2. État du code

### 2.1 Fusionné dans `preprod`, jamais livré

| Brique | Ce qu'elle apporte à la cliente |
|---|---|
| `feat/onboarding-v2` | Parcours d'inscription en 6 étapes, recommandations d'évènements, saisie d'un récit, relecture des récits dans `/admin` |
| `feat/fiche-evenement-v2` | Timeline « Pour se préparer », accès en train, mesures d'inclusion, refonte de la fiche |
| `feat/personnes-interessees` | « X personnes intéressées » et la liste des membres |
| `feat/avantages-evenement` | Bandeau code promo, délais allongés et places réservées |

**Le reste-à-faire commun à ces quatre briques, c'est la saisie.** Mesures
d'inclusion, codes promo et dispositions d'inscription n'ont **aucun écran
d'administration** : le rattachement se fait en SQL, évènement par évènement.
Tant que personne ne saisit, les blocs restent invisibles en production, et la
valeur promise ci-dessus n'existe pas.

### 2.2 Écrit et fonctionnel, hors `preprod`

| Branche | Retard sur `preprod` | À faire avant merge |
|---|---|---|
| `feat/calendrier-inscriptions` | 45 commits | rebaser puis merger. Le bouton « Me prévenir » n'est **pas** dans le périmètre — voir §2.4 |
| `feat/partage-experience` | 13 commits | rebaser puis merger. Sa migration doit passer **après** celle de la modération |
| `feat/score-adequation` | 22 commits, **divergée** | arbitrage produit, voir ci-dessous |
| `worktree-burger-menu-v2` | partie d'un `main` ancien | décider de son sort : elle refait le menu mobile, que `feat/nav-v2` refait aussi. L'une des deux doit disparaître |

**`feat/score-adequation` ne peut pas être fusionnée en l'état.** Elle porte sa
propre version du bloc « qui est intéressé », écrite avant que
`feat/personnes-interessees` ne sorte seule et parte dans `preprod`. Sept
fichiers en conflit, dont cinq créés des deux côtés. Ce n'est pas un conflit de
texte : il faut trancher **ce que la membre voit**, le niveau déclaré tel quel
(`preprod`) ou un repli en trois paliers (la branche), puis rebrancher le
questionnaire dessus. Chantier à programmer pour lui-même.

### 2.3 Maquettes — écrans en place, données en dur

Cinq branches à jour sur `preprod`. **Aucune ne lit la base, aucune ne porte de
migration.** Le geste et la mise en page sont tranchés, le branchement ne l'est
pas. Chacune porte sa section détaillée et sa checklist de branchement, sur sa
branche (§8).

| Branche | Ce qui bloque le branchement |
|---|---|
| `feat/evenements-similaires` | trancher la règle de sélection (éditoriale ou proximité). Si proximité : migration distance/durée |
| `feat/organisateur-enrichi` | trois colonnes additives — mais surtout **l'écran de saisie**, sans quoi elles resteront vides et rien ne changera à l'écran |
| `feat/social` | droits d'écriture sur le suivi, **profil privé**, et un **centre de notifications entièrement à concevoir** |
| `feat/recherche-v2` | **même migration distance/durée** que les évènements similaires — à écrire une seule fois pour les deux |
| `feat/nav-v2` | dépend du calendrier (sinon un quart de la navigation mène à une 404). À merger **en dernier** : c'est elle qui touche le plus de fichiers partagés |

**La migration partagée** : `events.distance` est du texte libre (« 180 »,
« 180 km », « 2x120 ») et la durée en jours n'existe nulle part. Deux colonnes
typées (`distance_km`, `duration_days`) et un backfill débloquent à la fois la
recherche par durée/distance et la proposition d'évènements similaires. Les
évènements dont ni l'une ni l'autre n'est calculable doivent rester trouvables
— **jamais exclus par un filtre qu'ils ne peuvent pas satisfaire**.

### 2.4 Non commencé, porté par aucune branche

- **Les alertes d'ouverture d'inscription.** Le calendrier montre les dates ;
  le bénéfice réel, selon le prototype, c'est d'être prévenue. Rien n'existe.
- **L'inscription publique** — le cycle « ça m'intéresse » → « je suis
  inscrite » → « et tout le monde peut le voir ». Aujourd'hui c'est un simple
  booléen. Bloque « ses inscriptions à venir » sur les profils.
- **Le centre de notifications.** Le prototype en a un complet ; il n'existe ni
  écran, ni donnée, ni brique au découpage. Révélé en maquettant le social.
- **Les écrans de saisie `/admin`** : mesures d'inclusion, avantages, fiche
  organisatrice.

---

## 3. Comment on travaille

```
feat/<brique>  →  preprod  →  main  →  prod
```

- Les branches `feat/*` partent de `preprod`, jamais de `main`.
- `preprod` est déployée en continu et sert à valider en conditions réelles.
- La livraison se fait en mergeant `preprod` dans `main`. `scripts/deploy.sh`
  refuse de tourner ailleurs que sur `main`.
- Si un correctif urgent est appliqué directement sur `main`, **remerger `main`
  dans `preprod`** ensuite, sinon il est perdu au prochain batch.

**Point à trancher** : merger `preprod` dans `main` livre *tout* d'un coup. Pour
livrer brique par brique, il faudrait cherry-picker.

**Chaque branche non fusionnée documente sa brique dans ce fichier, sur sa
branche.** Au merge, ce fichier entre en conflit : garder la structure de
`preprod` et y insérer la section de la branche.

### Feature flags

Table `app_features`, lue par `src/lib/features.ts`. Merger dans `main`
déclenche le déploiement ; le flag découple « le code est en prod » de
« l'utilisatrice le voit ». Aucune brique V2 n'en utilise aujourd'hui.

> Limite connue : `isEventProposalFeatureEnabled()` est codée en dur, une
> fonction par flag. Au-delà de deux ou trois briques flaguées, il faudra un
> `isFeatureEnabled(key)` générique et un écran d'interrupteurs dans `/admin`.

---

## 4. Séquence de livraison

### Avant tout : deux droits d'accès à vérifier en production

Relevés en base **locale**, sur des tables qu'aucune brique V2 n'a créées. Rien
n'a été corrigé : modifier à l'aveugle les droits d'une table partagée avec
l'app mobile serait pire que le problème. Soit les règles ont été posées à la
main dans le dashboard après la photo du schéma, soit la prod est réellement
dans cet état — **c'est ce qu'il faut aller regarder avant de livrer.**

1. **`public.favourite_events` n'a aucune règle d'écriture.** Le bouton « Ça
   m'intéresse » écrit pourtant en direct depuis le navigateur : en local, il
   répond 403. Bloque le bloc « qui est intéressé » *et* le score d'adéquation.
   Pour débloquer en local :

   ```sql
   create policy "Own favourites insert" on public.favourite_events
     for insert to authenticated with check ((select auth.uid()) = user_id);
   create policy "Own favourites delete" on public.favourite_events
     for delete to authenticated using ((select auth.uid()) = user_id);
   create policy "Own favourites update" on public.favourite_events
     for update to authenticated using ((select auth.uid()) = user_id)
     with check ((select auth.uid()) = user_id);
   ```

   Second point, plus ancien : `favourite_events` a `grant all … to anon` et une
   policy de `select` sans clause `to`. Avec la clé publique, n'importe qui peut
   énumérer qui a mis quoi en favori. Lecture seule, mais à traiter.

2. **`public.admin_users` a la RLS activée et aucune policy.** `assertAdmin()`
   lit sa propre ligne : sans policy, `/admin` renvoie tout le monde à
   l'accueil. Déblocage local :

   ```sql
   create policy "Own admin row is readable" on public.admin_users
     for select to authenticated using ((select auth.uid()) = user_id);
   ```

3. **Le suivi (`friendships`) n'a qu'un droit de lecture.** Même problème, il
   tombera le jour où le social se branche.

### Ordre de merge

```
1. feat/calendrier-inscriptions   (rebase — 45 commits de retard)
2. feat/partage-experience        (rebase)
3. feat/score-adequation          (après arbitrage produit)
4. les maquettes, une fois branchées
5. feat/nav-v2                    (en dernier, et après le calendrier)
```

### Ordre des migrations

Les fichiers sont indépendants et rejouables, à deux exceptions près :

```
20260905110000_moderation_recits.sql   (dans preprod)
        ↓ crée la colonne de statut
20260905120000_recits_valides.sql      (feat/partage-experience)
```

La seconde ne montre que les récits validés : jouée en premier, elle cherche une
colonne absente.

Et au rebase de `feat/score-adequation` : sa migration redéfinit
`sync_user_public()` **sans** la ville et porte un horodatage antérieur à celle
de `feat/personnes-interessees`, déjà dans `preprod`. Sur une base neuve l'ordre
les départage ; sur la prod, l'appliquer ensuite ferait perdre la recopie de la
ville. Sa partie « niveau » fait double emploi et doit disparaître.

### Dette connue à trancher

**`users.genre` double `users.gender`.** `gender` existait en prod
(FlutterFlow) quand `genre` a été ajoutée. Les deux coexistent et **la webapp
écrit dans les deux selon l'écran** : l'inscription et `/profil` écrivent
`genre`, l'éditeur d'utilisatrices de `/admin` écrit `gender`. Les lectures ne
regardent que `genre` — une correction faite depuis `/admin` n'a aucun effet
visible. À trancher avant que l'app mobile, qui lit `gender`, ne diverge pour de
bon.

---

## 5. Règles de base de données

Il n'y a **qu'une seule base** (la prod). Pas de staging — décision assumée. Les
règles ci-dessous sont ce qui rend cette situation tenable.

### Additif uniquement

`ADD COLUMN` nullable, nouvelle table. **Jamais** `RENAME`, `DROP` ou changement
de type tant que l'ancien champ est utilisé. Conséquences :

- L'ancien code continue de tourner face au nouveau schéma → les branches
  restent indépendantes quel que soit l'ordre d'application.
- Un fichier de migration par branche → jamais de conflit git (append-only).

Corollaire : **les clés étrangères vont dans les tables enfants**
(`event_inclusion_measures.event_id`), pas sur `events`. La table `events` n'est
donc modifiée par aucune brique.

### RLS et grants dans la même migration

Créer une table dans le schéma `public`, c'est **publier une API HTTP
immédiatement interrogeable** avec la clé publique. Le feature flag protège
l'UI, pas la base. Toute migration créant une table doit donc contenir, dans le
même fichier :

```sql
alter table public.<table> enable row level security;
revoke all on table public.<table> from anon, authenticated;
grant select, insert, update on table public.<table> to authenticated;
create policy ... ;
```

Particulièrement critique pour les récits (contenu identifiant) et les réponses
au questionnaire (données personnelles).

### Ordre d'application

```
migration en base  →  merge du code  →  activation du flag
```

Toujours la base avant le code : une colonne inutilisée ne gêne personne, du
code cherchant une table absente plante.

Il n'y a **aucune CI** dans ce projet — les migrations sont appliquées à la
main. Tenir une checklist de ce qui est déjà passé en prod.

### Migrations touchant des données existantes

Les backfills sont le seul geste vraiment risqué. Pour ceux-là uniquement :
backup pris juste avant, et écriture rejouable sans dégât
(`ON CONFLICT DO NOTHING`, `UPDATE ... WHERE colonne IS NULL`).

---

## 6. Comment l'app parle à Supabase

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
| Évènements | `events`, `sous_events` | server / client |
| Favoris & inscriptions | `favourite_events` | client (contexte React) |
| Profil | `users` + `user_metadata`, `user_public` | server |
| Organisatrices | `organisateurs`, `favourite_organisateurs` | server |
| Suivi entre membres | `friendships` | — (pas encore branché) |
| Collections | `collections`, `collection_events` | server |
| Statut admin | `admin_users` | server |
| Feature flags | `app_features` | **admin** (revoke anon+authenticated) |
| Propositions d'évènement | `event_submission_contacts` | admin |
| Feedback | `feedback_entries` | server |
| Images | bucket storage via `/api/storage` | admin |

> **La jointure évènement → organisatrice se fait par le nom**
> (`events.organisateur = organisateurs.nom_orga`). Renommer une organisatrice
> détache ses évènements. `ensure_organisateur()` protège l'écriture depuis
> l'app, rien ne protège une correction faite à la main dans Studio. Passer à
> une clé étrangère est un vrai backfill : à faire le jour où ça coince.

---

## 7. Environnement local

`.env.local` (gitignoré) pointe sur un stack Supabase **local**, pas sur la
prod. Le stack tourne dans Docker via Colima.

```bash
colima start
supabase start      # depuis la racine du dépôt
npm run dev
```

| Service | URL |
|---|---|
| API (REST, Auth, Storage) | http://127.0.0.1:54321 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio | http://127.0.0.1:54323 |
| Mailpit (tous les mails sortants) | http://127.0.0.1:54324 |

Les mails d'authentification n'arrivent nulle part ailleurs que dans Mailpit,
d'où l'on récupère les liens de confirmation.

`SUPABASE_SECRET_KEY` contient la vraie `service_role` **du stack local** :
c'est une clé de démo, identique sur toutes les installations Supabase CLI, sans
valeur en dehors de la machine. Rien n'est donc bridé en local — `/admin`, les
flags et le proxy d'images fonctionnent vraiment.

### ⚠️ Les migrations ne décrivent pas le socle de la base

Elles ne créent que six tables (`collections`, `collection_events`,
`admin_users`, `app_features`, `feedback_entries`,
`event_submission_contacts`). Les vingt autres — `users`, `events`,
`organisateurs`, `user_public`, `friendships`, `sous_events`… — viennent de
FlutterFlow et du dashboard : elles n'ont jamais été décrites par une migration.

**Conséquence : `supabase db reset` ne reconstruit pas une base exploitable.**
Il vide le volume puis échoue à la première migration V2. Pour repartir d'une
base neuve, appliquer d'abord la photo du schéma de prod (conservée hors dépôt,
expurgée de ses clés et de ses webhooks) :

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -f ~/Sites/upcomi-db-baseline/schema_prod_2026-09-01.sql
supabase migration up
```

Le seed (`supabase/seed.sql`) n'est pas versionné : il est propre à chaque
poste. La base locale porte ~93 évènements et **0 `sous_events`** — les écrans
qui en dépendent (distance, dénivelé, type de vélo, donc le score d'adéquation)
apparaissent vides tant qu'on n'en crée pas à la main.

### Écrire une migration

Fichier dans `supabase/migrations/`, au format `AAAAMMJJHHMMSS_description.sql`,
puis `supabase migration up`. Une migration n'est poussée en prod qu'après avoir
été jouée ici.

### Si l'on retourne sur la prod

- ne pas mettre la vraie clé `service_role` de prod dans un `.env` local ;
- utiliser un compte de test plutôt qu'un compte réel ;
- ne jamais coller de SQL « pour voir » dans le SQL Editor de la prod (les
  `select` sont sans danger, tout le reste mérite un backup préalable).

> `pnpm` n'est pas installé sur la machine de dev alors que le dépôt a un
> `pnpm-lock.yaml`. Les dépendances ont été installées avec `npm`. Rester sur le
> même gestionnaire que l'équipe.

---

## 8. Où lire le détail

Le détail brique par brique — ce qui est livré, les décisions prises, la
checklist de branchement — vit **sur la branche concernée**, dans ce même
fichier. Pour le lire sans changer de branche :

```bash
git show feat/social:docs/upcomi-v2.md
```

Branches concernées : `feat/calendrier-inscriptions`,
`feat/partage-experience`, `feat/score-adequation`,
`feat/evenements-similaires`, `feat/organisateur-enrichi`, `feat/social`,
`feat/recherche-v2`, `feat/nav-v2`.

Pour les quatre briques déjà fusionnées dans `preprod`, le journal détaillé des
décisions est dans l'historique git de ce fichier (`git log -p docs/upcomi-v2.md`,
avant la refonte de ce document).
