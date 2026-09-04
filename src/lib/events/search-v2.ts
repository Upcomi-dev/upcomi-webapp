/**
 * Recherche V2 — le référentiel des trois axes. MAQUETTE.
 *
 * La recherche du prototype tient en trois questions posées dans cet ordre :
 * **combien de temps**, **quelle distance**, **pour quand**. Le reste (type,
 * vélo, zone, mixité) passe derrière un « Filtres… » replié — en test
 * utilisateur, aucune participante ne trouvait le champ de recherche libre
 * tant qu'il était rangé là-dedans.
 *
 * L'ordre n'est pas décoratif : **la durée conditionne les paliers de
 * distance**. Une sortie à la journée et un raid de cinq jours n'appellent pas
 * les mêmes ordres de grandeur, et proposer « moins de 300 km » à quelqu'un qui
 * cherche une journée ne veut rien dire.
 *
 * ------------------------------------------------------------------
 * ⚠️ Ce sur quoi cette brique bute, et qui ne se voit pas à l'écran
 * ------------------------------------------------------------------
 *
 * **Les deux premiers axes n'ont pas de donnée en base.**
 *
 * - `events.distance` est du **texte** libre (« 180 », « 180 km », « 2x120 »).
 *   Le filtre actuel tourne sur `distance_range_filter`, quatre chaînes figées
 *   (« Moins de 200km », « Entre 200 et 500km »…). C'est trop grossier pour les
 *   paliers du proto, et surtout ça ne peut pas se spécialiser selon la durée.
 * - **La durée en jours n'existe nulle part.** `formatDurationLabel()` la
 *   déduit de `dateEvent`/`dateFin`, absentes ou égales sur une bonne part du
 *   catalogue. `sous_events.delai` est du texte.
 *
 * D'où la migration additive, **partagée avec les évènements similaires
 * (§12)**, qui bute exactement sur les deux mêmes colonnes :
 *
 *   alter table public.events add column if not exists distance_km   integer;
 *   alter table public.events add column if not exists duration_days smallint;
 *
 * plus un backfill depuis `sous_events` (max des distances) et depuis
 * `dateEvent`/`dateFin` (nombre de jours, bornes incluses). **À écrire une fois
 * pour les deux briques.**
 *
 * Tant qu'elles n'existent pas, ces deux axes ne peuvent pas filtrer — c'est la
 * raison, et la seule, pour laquelle cette maquette ne touche pas à l'URL.
 */

export interface DurationOption {
  id: string;
  label: string;
}

export interface DistanceStep {
  label: string;
}

/** Le premier critère renseigné : il commande les paliers de distance. */
export const DURATION_OPTIONS: DurationOption[] = [
  { id: "1", label: "1 journée" },
  { id: "2", label: "2 jours" },
  { id: "3-4", label: "3 à 4 jours" },
  { id: "5+", label: "5 jours et +" },
];

/**
 * Paliers génériques, servis tant qu'aucune durée — ou plusieurs — n'est
 * choisie : avec deux durées cochées, on ne peut pas trancher lequel des jeux
 * afficher.
 */
export const DEFAULT_DISTANCE_STEPS: DistanceStep[] = [
  { label: "Toutes distances" },
  { label: "Moins de 300 km" },
  { label: "De 300 à 600 km" },
  { label: "De 600 à 1200 km" },
  { label: "Plus de 1200 km" },
];

/**
 * Paliers par durée. Sur une journée on reste sous les 200 km (rando, BRM
 * court, cyclosportive) : le kilométrage sert surtout à situer le format.
 */
export const DISTANCE_STEPS_BY_DURATION: Record<string, DistanceStep[]> = {
  "1": [
    { label: "Toutes distances" },
    { label: "Moins de 50 km" },
    { label: "De 50 à 100 km" },
    { label: "De 100 à 150 km" },
    { label: "De 150 à 200 km" },
  ],
  "2": [
    { label: "Toutes distances" },
    { label: "Moins de 150 km" },
    { label: "De 150 à 300 km" },
    { label: "De 300 à 450 km" },
    { label: "Plus de 450 km" },
  ],
  "3-4": [
    { label: "Toutes distances" },
    { label: "Moins de 400 km" },
    { label: "De 400 à 700 km" },
    { label: "De 700 à 1000 km" },
    { label: "Plus de 1000 km" },
  ],
  "5+": [
    { label: "Toutes distances" },
    { label: "Moins de 800 km" },
    { label: "De 800 à 1500 km" },
    { label: "De 1500 à 2500 km" },
    { label: "Plus de 2500 km" },
  ],
};

/**
 * Les paliers ne se spécialisent que si **une seule** durée est cochée :
 * sinon on retombe sur les génériques.
 */
export function getDistanceSteps(durations: string[]): DistanceStep[] {
  if (durations.length !== 1) return DEFAULT_DISTANCE_STEPS;
  return DISTANCE_STEPS_BY_DURATION[durations[0]] ?? DEFAULT_DISTANCE_STEPS;
}

export interface KnownPeriod {
  id: string;
  label: string;
  start: string;
  end: string;
}

/**
 * Les périodes que tout le monde a en tête. Elles évitent de faire poser deux
 * dates pour « le week-end de l'Ascension ».
 *
 * ⚠️ **En dur, année par année** — comme dans le prototype. Au branchement, il
 * faut soit une table, soit un calcul (les fêtes mobiles se calculent depuis
 * Pâques), sinon la liste sera périmée en 2027.
 */
const ALL_KNOWN_PERIODS: KnownPeriod[] = [
  { id: "toussaint-2026", label: "Vacances de la Toussaint", start: "2026-10-17", end: "2026-11-02" },
  { id: "noel-2026", label: "Vacances de Noël", start: "2026-12-19", end: "2027-01-04" },
  { id: "ascension-2027", label: "Week-end de l'Ascension", start: "2027-05-06", end: "2027-05-09" },
  { id: "pentecote-2027", label: "Week-end de Pentecôte", start: "2027-05-15", end: "2027-05-17" },
  { id: "ete-2027", label: "Vacances d'été", start: "2027-07-03", end: "2027-08-31" },
];

/**
 * Seules les périodes encore à venir, dans l'ordre. Une liste en dur vieillit :
 * sans ce filtre, « Vacances de Noël 2026 » resterait proposée en 2027.
 */
export function getUpcomingPeriods(today = new Date()): KnownPeriod[] {
  const todayKey = today.toISOString().slice(0, 10);
  return ALL_KNOWN_PERIODS.filter((period) => period.end >= todayKey);
}

/** Types de vélo et zones proposés par les filtres repliés. */
export const BIKE_TYPES = ["Route", "Gravel", "VTT", "Bikepacking"];
export const ZONES = ["France", "Étranger"];

const MONTH_FORMAT = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

/** Les douze mois à venir, à partir du mois courant. */
export function getUpcomingMonths(from = new Date()): { key: string; label: string }[] {
  return Array.from({ length: 12 }, (_, offset) => {
    const date = new Date(from.getFullYear(), from.getMonth() + offset, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: MONTH_FORMAT.format(date),
    };
  });
}

export function formatShortDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(year, month - 1, day)
  );
}
