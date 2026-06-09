# Changelog

## [0.3.17] - 2026-06-09

### UI
- fix: désactive la confirmation de la modale dates tant qu'aucune date n'est sélectionnée

## [0.3.16] - 2026-06-09

### UI
- feat: sépare les favoris à venir et terminés avec affichage progressif des anciens événements
- feat: ouvre le filtre de dates dans une modale calendrier
- style: applique la police serif Upcomi aux titres d'événements des cards collection

## [0.3.15] - 2026-05-29

### UI
- style: ajuste la zone basse des cards collection avec date, titre centré verticalement et lieu ancré en bas

## [0.3.14] - 2026-05-05

### Analytics
- feat: ajout de Vercel Web Analytics et duplication des événements custom existants vers Vercel

### Auth
- fix: amélioration du parcours de réinitialisation de mot de passe et des modales d'authentification

## [0.3.10] - 2026-04-30

### Tooling
- chore: ajout du plugin Codex local `upcomi-deploy` exposant la commande `/deploy`
- chore: activation par défaut du plugin Codex local dans le marketplace du repo

## [0.3.9] - 2026-04-30

### UI
- fix: ajout d'une croix unique pour effacer la recherche textuelle sans variation de hauteur sur mobile

### Tooling
- chore: ajout de la commande `npm run deploy` pour bumper la version, committer et pousser `main`

## [0.3.6] - 2026-04-28

### UI
- style: ajustement de la taille des textes secondaires sur mobile (mi-chemin entre l'original et v0.3.5) pour un meilleur équilibre lisibilité/densité

## [0.3.5] - 2026-04-28

### UI
- style: agrandissement des textes secondaires (date/lieu, description, parcours) sur mobile pour améliorer la lisibilité

## [0.3.0] - 2026-04-16

### Features
- feat: preview card mobile au clic sur un marqueur carte (remplace le panneau détail plein écran)
- feat: carousel de cards pour les événements groupés au même endroit (remplace le spider/spiderfied)

### Refactor
- refactor: suppression complète du mécanisme spider (legs + dots) au profit de cards EventCard en carrousel

## [0.2.0] - 2026-04-15

### Features
- feat: filtre « Mixité choisie » (mint) sur la liste et la carte avec tooltip explicatif
- feat: CTA favoris compact type « bookmark » avec compteur inline sur la page détail
- feat: prix affiché « À partir de X€ » aligné à droite sur desktop et mobile

### Bug Fixes
- fix: masque la date de fin quand elle est identique à la date de début
- fix: drawer détail utilise la couleur de fond du thème (plus cohérent)

### UI
- style: titre hero avec retour ligne manuel pour meilleur rythme typographique
