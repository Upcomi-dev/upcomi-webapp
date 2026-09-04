/**
 * Fiche d'organisation — MAQUETTE, données en dur.
 *
 * Le bloc « Qui organise ? » de la fiche évènement n'affiche aujourd'hui qu'un
 * nom et un lien vers le site. Le prototype y ajoute une description et les
 * comptes Instagram et Strava de l'organisation. Cette maquette pose ces
 * champs à l'écran ; elle ne les lit pas.
 *
 * ------------------------------------------------------------------
 * À lire avant de brancher pour de vrai
 * ------------------------------------------------------------------
 *
 * L'entité existe déjà et **il n'y a rien à créer ni à dédoublonner** (plan
 * V2, §2.1) : `public.organisateurs` porte `nom_orga`, `image`, `nb_events` et
 * `nb_abo`, `ensure_organisateur()` déduplique sur `lower(btrim(nom_orga))`, et
 * `get_organizer_details(id)` sait déjà rendre la page d'une organisation. La
 * jointure se fait par **nom** : `events.organisateur = organisateurs.nom_orga`.
 *
 * Il ne manque que les trois champs que le proto affiche. Migration additive,
 * sans backfill :
 *
 *   alter table public.organisateurs add column if not exists description text;
 *   alter table public.organisateurs add column if not exists instagram_url text;
 *   alter table public.organisateurs add column if not exists strava_url text;
 *
 * Points à trancher au branchement, qu'une maquette ne peut pas décider :
 *
 * 1. **Qui saisit ces champs ?** Ils n'arrivent par aucun flux existant.
 *    `/proposer-un-evenement` appelle `ensure_organisateur()` mais ne collecte
 *    ni description ni réseaux. Sans écran de saisie (dans `/admin`, le plus
 *    probable), les colonnes resteront vides et le bloc n'aura pas bougé.
 * 2. **`nb_abo` et `favourite_organisateurs` existent en base** — de quoi
 *    afficher « X abonné·es » et un bouton « S'abonner ». **Le prototype ne le
 *    fait pas** : son bloc organisateur s'arrête aux liens. Ne pas l'ajouter
 *    sans décision produit ; c'est un abonnement de plus à côté de « Suivre »
 *    quelqu'un (§14), et les deux ne veulent pas dire la même chose.
 * 3. **La jointure par nom reste le point faible du modèle** : renommer une
 *    organisation détache ses évènements. `ensure_organisateur()` protège
 *    l'écriture, rien ne protège une correction faite à la main dans Studio.
 */

export interface OrganizerProfile {
  name: string;
  /** URL du logo. `null` → on retombe sur les initiales, comme aujourd'hui. */
  image: string | null;
  description: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  stravaUrl: string | null;
}

/**
 * Maquette : une seule fiche, servie pour toutes les organisations. Seul le
 * nom vient de l'évènement consulté — c'est la seule donnée réelle que la
 * page a déjà sous la main, et voir le vrai nom évite de croire que le bloc
 * est entièrement faux.
 *
 * `websiteUrl` vient lui aussi du réel (`events.URL`) : le lien « Voir le
 * site » existe déjà en production, la maquette ne doit pas le casser.
 */
export function getOrganizerProfile(
  name: string,
  websiteUrl: string | null
): OrganizerProfile {
  return {
    name,
    image: null,
    description: `${name} organise des sorties longue distance en autonomie, avec une attention particulière portée à l'accueil des femmes et des minorités de genre. L'équipe reconnaît le parcours chaque année et publie ses traces à l'avance.`,
    websiteUrl,
    instagramUrl: "https://instagram.com/upcomi.cc",
    stravaUrl: "https://www.strava.com/clubs/upcomi",
  };
}
