/**
 * Évènements similaires — MAQUETTE, données en dur.
 *
 * Rien n'est lu en base ici : la fonction renvoie toujours les mêmes six
 * évènements fictifs, quel que soit l'évènement consulté. Le but est de
 * valider l'écran (place du bloc dans la page, densité, lisibilité du
 * carrousel), pas la sélection.
 *
 * ------------------------------------------------------------------
 * À lire avant de brancher pour de vrai
 * ------------------------------------------------------------------
 *
 * Le plan V2 (§2.1) annonce « zéro migration, une requête sur `collections` /
 * `collection_events` ». **Le prototype ne fait pas ça.** `getSimilarEvents()`
 * (upcomi-clone, `assets/js/data.js`) classe tous les évènements à venir par
 * un score de proximité, du plus proche au plus lointain :
 *
 *   score  = min(|distance − distance_ref| / distance_ref, 2) × 3
 *          + min(|durée − durée_ref|, 4) × 0.6
 *          + 1.5  si aucun type de vélo en commun
 *          + 0.8  si le type d'évènement diffère
 *          + 1.2  si la mixité choisie diffère
 *
 * Ce sont deux specs différentes — une sélection éditoriale (collections) et
 * un calcul de proximité — et il faut trancher laquelle on livre.
 *
 * Si c'est le score, il manque la donnée :
 *
 * - `events.distance` est du **texte** libre (« 180 », « 180 km », « 2x120 »).
 *   Le seul champ exploitable aujourd'hui est `distance_range_filter`, quatre
 *   chaînes (« Moins de 200km »…) — trop grossier pour un écart relatif.
 * - **La durée en jours n'existe nulle part.** `formatDurationLabel()` la
 *   déduit de `dateEvent`/`dateFin`, absentes ou égales sur une bonne part du
 *   catalogue. `sous_events.delai` est du texte.
 * - Le **dénivelé** n'est pas sur `events` : il vit sur `sous_events.elevation`
 *   et se remonte à part (voir `fetchEventMaxElevations`).
 *
 * D'où la migration additive à prévoir — la même que pour la Recherche V2, qui
 * bute exactement sur les deux mêmes colonnes :
 *
 *   alter table public.events add column if not exists distance_km integer;
 *   alter table public.events add column if not exists duration_days smallint;
 *
 * plus un backfill depuis `sous_events` (max des distances) et depuis
 * `dateEvent`/`dateFin` (nombre de jours, bornes incluses).
 */

/** La forme exacte attendue par `EventCard` — rien de plus. */
export interface SimilarEvent {
  id: number;
  slug: string;
  nomEvent: string;
  dateEvent: string;
  dateFin: string | null;
  image: string;
  bike_type: string | null;
  type_event: string | null;
  villeDepart: string;
  paysDepart: string;
  distance: string;
  maxElevation: number | null;
  mint: boolean;
}

/**
 * Les identifiants sont volontairement hors de portée du catalogue réel
 * (900 000+) : une carte de maquette ne doit jamais tomber par hasard sur un
 * vrai évènement, ni écrire un favori sur un `id` existant. En contrepartie
 * ses liens ne mènent nulle part — c'est assumé le temps de la maquette.
 */
const MOCK_SIMILAR_EVENTS: SimilarEvent[] = [
  {
    id: 900_001,
    slug: "maquette-diagonale-des-cimes",
    nomEvent: "La Diagonale des Cimes",
    dateEvent: "2026-09-13",
    dateFin: "2026-09-20",
    image:
      "https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=800&auto=format&fit=crop",
    bike_type: "Gravel",
    type_event: "Ultra",
    villeDepart: "Briançon",
    paysDepart: "France",
    distance: "1300 km",
    maxElevation: 19000,
    mint: false,
  },
  {
    id: 900_002,
    slug: "maquette-sel-et-bitume",
    nomEvent: "Sel & Bitume",
    dateEvent: "2026-09-14",
    dateFin: "2026-09-19",
    image:
      "https://images.unsplash.com/photo-1587241321921-91a834d6d191?q=80&w=800&auto=format&fit=crop",
    bike_type: "Gravel",
    type_event: "Aventure",
    villeDepart: "Grenoble",
    paysDepart: "France",
    distance: "1000 km",
    maxElevation: 14000,
    mint: false,
  },
  {
    id: 900_003,
    slug: "maquette-nordkapp-drift",
    nomEvent: "Nordkapp Drift",
    dateEvent: "2026-09-25",
    dateFin: "2026-09-28",
    image:
      "https://images.unsplash.com/photo-1715900677967-fb67cee16359?q=80&w=800&auto=format&fit=crop",
    bike_type: "Gravel",
    type_event: "Ultra",
    villeDepart: "Tromsø",
    paysDepart: "Norvège",
    distance: "500 km",
    maxElevation: 8200,
    mint: true,
  },
  {
    id: 900_004,
    slug: "maquette-traversee-du-morvan",
    nomEvent: "La Traversée du Morvan",
    dateEvent: "2026-10-03",
    dateFin: "2026-10-04",
    image:
      "https://images.unsplash.com/photo-1618048558171-8c9edde77055?q=80&w=800&auto=format&fit=crop",
    bike_type: "Gravel",
    type_event: "Aventure",
    villeDepart: "Autun",
    paysDepart: "France",
    distance: "240 km",
    maxElevation: 3400,
    mint: true,
  },
  {
    id: 900_005,
    slug: "maquette-cap-vers-le-sud",
    nomEvent: "Cap vers le Sud",
    dateEvent: "2026-10-17",
    dateFin: "2026-10-22",
    image:
      "https://images.unsplash.com/photo-1616350428103-cc6bf12d46f0?q=80&w=800&auto=format&fit=crop",
    bike_type: "Route",
    type_event: "Ultra",
    villeDepart: "Clermont-Ferrand",
    paysDepart: "France",
    distance: "900 km",
    maxElevation: 11500,
    mint: false,
  },
  {
    id: 900_006,
    slug: "maquette-nuits-des-causses",
    nomEvent: "Les Nuits des Causses",
    dateEvent: "2026-11-07",
    dateFin: "2026-11-08",
    image:
      "https://images.unsplash.com/photo-1673949285591-2cfa0f39e2e8?q=80&w=800&auto=format&fit=crop",
    bike_type: "Bikepacking",
    type_event: "Aventure",
    villeDepart: "Millau",
    paysDepart: "France",
    distance: "320 km",
    maxElevation: 5100,
    mint: false,
  },
];

/**
 * Maquette : renvoie toujours la même liste, sans regarder l'évènement
 * consulté. `currentEventId` n'est là que pour figurer la signature de la
 * vraie fonction — et pour éviter, si jamais un identifiant de maquette
 * finissait par exister, que la fiche se propose elle-même.
 */
export function getSimilarEvents(currentEventId: number, limit = 6): SimilarEvent[] {
  return MOCK_SIMILAR_EVENTS.filter((event) => event.id !== currentEventId).slice(0, limit);
}
