# Migrations d'inscription — appliquées le 5 octobre 2026

## Cible

Projet Supabase **Upcomi**, référence `hgsfjkgvqcougfamkncj`, région Paris,
PostgreSQL 15. C'est le projet désigné par le `.env.local` copié du dépôt
principal ; la branche Git `preprod` ne crée pas une base distante distincte.
Le CLI de ce worktree est maintenant lié à ce projet.

## Application effectuée

Les cinq migrations suivantes ont été exécutées dans une seule transaction,
avec leurs textes et versions enregistrés dans
`supabase_migrations.schema_migrations`. Un premier essai complet a été annulé
par `ROLLBACK`, puis la même sélection a été appliquée et validée par `COMMIT`.

| Version | Migration | Résultat |
| --- | --- | --- |
| `20260901103000` | `onboarding_v2` | Table de recommandations avec RLS propriétaire. |
| `20260903001000` | `event_stories` | Table des récits et recherche des événements déjà couverts. |
| `20260904160000` | `personnes_interessees` | Niveau/ville publics, trigger de synchronisation et fonctions de liste/compteur. |
| `20260905110000` | `moderation_recits` | Champs et politique de modération des récits. |
| `20261005194920` | `harden_onboarding_profile_sync` | Droits des fonctions, contrôle des champs de modération et reprise des profils publics manquants. |

Les migrations `20260903000000_users_own_row_rls` et
`20260903000100_user_public_own_row_rls` n'ont pas été rejouées : l'audit SQL a
confirmé des politiques équivalentes déjà actives, sous d'autres noms.
Elles n'ont pas été artificiellement marquées comme appliquées.

Aucun `db push` global n'a été lancé. L'historique distant présente déjà des
versions différentes de certains fichiers historiques du dépôt ; sa remise
en concordance globale dépasse cette correction.

## Comportement final

- `users.pref2` et `users.ville` restent la source du niveau et de la ville.
- Le trigger copie ces champs dans `user_public` au sein de la même transaction.
  Il reste en `SECURITY INVOKER`, avec un `search_path` fixe.
- Le navigateur ne fait plus de seconde écriture dans `user_public`, et le
  repli temporaire pour les colonnes manquantes a été retiré.
- Les RPC de liste et de compteur respectent les politiques des tables.
  La liste est réservée aux membres ; seul le compteur est accessible sans compte.
- Une autrice peut enregistrer son récit uniquement en attente, sans identité
  ni date de validation. La politique admin distincte reste en place.
- La recherche globale des événements ayant un récit utilise une fonction
  privilégiée dans `upcomi_private`, avec vérification de session. Le point
  d'entrée public reste en `SECURITY INVOKER` et ne retourne que des IDs d'événements.
- Aucun réglage Auth distant n'a été abaissé. Les critères affichés correspondent
  à l'exigence distante observée : 8 caractères, minuscules, majuscules,
  chiffres et symboles. La configuration locale est alignée sur PostgreSQL 15.

## Vérifications effectuées

- Les cinq versions sont présentes dans le journal distant.
- Les 57 profils existants ont une copie publique ; aucun écart de niveau/ville.
- Les nouvelles tables ont RLS activée.
- Avec deux comptes temporaires et leurs sessions ordinaires : sauvegarde et
  relecture des quatre niveaux dans le profil privé, public et les métadonnées.
- Une modification de `users` seule synchronise bien niveau et ville publics.
- Lecture du profil privé d'autrui et écritures sur les profils d'autrui bloquées.
- Aucune lecture anonyme des profils publics.
- Recommandations enregistrées sans doublon et sans accès aux données d'autrui.
- Récit en attente enregistré ; auto-approbation et fausse signature de
  modération refusées ; contenu d'autrui inaccessible.
- Recherche des événements couverts fonctionnelle depuis un autre compte,
  sans exposer le récit ; RPC réservées aux membres refusées en anonyme.
- Compteur public et fin d'inscription vérifiés.
- Comptes temporaires et toutes leurs données de test supprimés et absence vérifiée.
- Conseillers de sécurité : 43 alertes avant, 42 après ; aucune nouvelle alerte.
  L'alerte `search_path` du trigger de profil est résolue. Les 42 alertes
  préexistantes hors périmètre ne sont pas présentées comme corrigées.

`checks/onboarding-preflight.sql` permet de relire le schéma, les fonctions,
les droits et les politiques sans consulter de données personnelles.
