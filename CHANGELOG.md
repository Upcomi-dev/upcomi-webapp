# Changelog

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
