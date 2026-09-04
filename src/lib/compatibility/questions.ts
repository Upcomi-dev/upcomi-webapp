/**
 * Le catalogue des questions du score d'adéquation, porté du prototype
 * (`assets/js/data.js`, `BASE_COMPAT_QUESTIONS`).
 *
 * Il reste **dans le code** et non en base : une question porte des échelons,
 * des libellés et, pour le curseur, une fonction de résolution. C'est de la
 * logique, pas de la donnée. Seules les *réponses* sont stockées
 * (`user_compatibility_answers`).
 */

/**
 * Le vocabulaire des types de vélo. Fermé et validé à l'écriture — le parcours
 * d'une proposition d'évènement rejette toute autre valeur, et
 * `events.bike_type` est construit en joignant ces valeurs par des virgules
 * (voir `src/app/proposer-un-evenement/actions.ts`).
 */
export const BIKE_TYPES = ["Route", "Gravel", "VTT"] as const;

export type BikeType = (typeof BIKE_TYPES)[number];

/**
 * Lit un champ de type de vélo : « Gravel », « Route, Gravel »…
 *
 * Appartenance exacte au vocabulaire, jamais de recherche de sous-chaîne. Le
 * prototype testait `/gravel|mixte/` sur du texte libre : « mixte » n'existe
 * pas dans cette base, et une regex accepte n'importe quoi qui contient le mot
 * — c'est exactement ce qu'on ne veut pas d'un champ dont les valeurs sont
 * connues d'avance.
 */
export function parseBikeTypes(value: string | null | undefined): BikeType[] {
  if (!value) return [];

  const found = value
    .split(",")
    .map((part) => part.trim().toLocaleLowerCase("fr-FR"))
    .filter(Boolean);

  return BIKE_TYPES.filter((type) => found.includes(type.toLocaleLowerCase("fr-FR")));
}

/** Un parcours de l'évènement, réduit à ce dont le questionnaire a besoin. */
export interface CompatRoute {
  name: string;
  /** Types de vélo du parcours, déjà lus (voir `parseBikeTypes`). */
  bikeTypes: BikeType[];
  distanceKm: number | null;
  elevationM: number | null;
}

export interface CompatOptionResolved {
  value: string;
  label: string;
  /** Échelon dans sa propre question, à partir de 1 (0 = « je n'en fais pas »). */
  level: number;
  /** Renseigné par la seule question à curseur. */
  km?: number;
}

interface ChoiceQuestion {
  key: string;
  type: "choice";
  question: string;
  options: CompatOptionResolved[];
  /** Nombre d'échelons, pour ramener la réponse sur l'échelle commune 1-4. */
  scaleMax: number;
  /** `false` pour les questions qui n'entrent pas dans le palier (itinéraire). */
  scored: boolean;
}

interface SliderQuestion {
  key: string;
  type: "slider";
  question: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  scaleMax: number;
  scored: boolean;
  resolve: (value: string | number) => CompatOptionResolved;
}

export type CompatQuestion = ChoiceQuestion | SliderQuestion;

export type CompatAnswers = Record<string, string>;

/**
 * Le socle commun, posé sur tous les évènements et réutilisé de l'un à
 * l'autre. Ce sont les trois seules questions qui décident du palier — voir
 * `getProfileScore`.
 */
export const BASE_COMPAT_QUESTIONS: CompatQuestion[] = [
  {
    // « Heures de selle » n'était pas compris d'une débutante en test, et
    // l'écart 4h-8h / 8h-15h était trop large : on répond en fourchette basse
    // « par prudence », ce qui fausse le conseil final. D'où des repères
    // concrets, et un palier intermédiaire de plus.
    key: "sortieHeures",
    type: "choice",
    question: "Quelle est la plus longue sortie que tu aies faite d'une traite ?",
    scaleMax: 5,
    scored: true,
    options: [
      { value: "moins-4h", label: "Moins de 4h", level: 1 },
      { value: "demi-journee", label: "Une demi-journée", level: 2 },
      { value: "journee", label: "Une journée", level: 3 },
      { value: "longue-journee", label: "Une longue journée", level: 4 },
      { value: "plusieurs-jours", label: "Plusieurs jours d'affilée", level: 5 },
    ],
  },
  {
    // Curseur de 50 en 50 km plutôt que des tranches : on évite le réflexe
    // « je choisis la tranche basse » observé en test.
    key: "distanceMax",
    type: "slider",
    question: "Quelle est la plus longue distance que tu aies parcourue en une seule sortie ?",
    min: 50,
    max: 400,
    step: 50,
    defaultValue: 100,
    scaleMax: 4,
    scored: true,
    resolve(value) {
      const km = Math.max(this.min, Math.min(this.max, Number(value) || this.defaultValue));
      const level = km < 100 ? 1 : km < 200 ? 2 : km < 400 ? 3 : 4;
      return {
        value: String(km),
        label: km >= this.max ? `${this.max} km et plus` : `${km} km`,
        level,
        km,
      };
    },
  },
  {
    key: "deniveleMax",
    type: "choice",
    question: "Quel est le plus gros dénivelé que tu aies fait sur une sortie ?",
    scaleMax: 4,
    scored: true,
    options: [
      { value: "1000", label: "Moins de 1000 m", level: 1 },
      { value: "2000", label: "1000 à 2000 m", level: 2 },
      { value: "3500", label: "2000 à 3500 m", level: 3 },
      { value: "3500+", label: "Plus de 3500 m", level: 4 },
    ],
  },
  // La question « as-tu déjà roulé en groupe ? » a été retirée par le proto :
  // en test, elle était comprise comme « rouler avec des inconnues », ce qui
  // n'est pas ce qu'elle mesurait.
];

const TERRAIN_OPTIONS: CompatOptionResolved[] = [
  { value: "aucun", label: "Je n'en fais pas", level: 0 },
  { value: "debutant", label: "Débutant·e", level: 1 },
  { value: "intermediaire", label: "Intermédiaire", level: 2 },
  { value: "confirme", label: "Confirmé·e, terrain engagé", level: 3 },
];

/**
 * Questions « revêtement », posées seulement en complément sur les évènements
 * dont le parcours concerné emprunte effectivement ce terrain : inutile de
 * demander son niveau VTT pour une épreuve 100 % route.
 *
 * Elles n'entrent pas dans le palier (`scored: false`) : elles nuancent le
 * score d'adéquation à l'évènement, pas l'expérience globale sur laquelle on
 * apparie les personnes.
 */
export const GRAVEL_COMPAT_QUESTION: CompatQuestion = {
  key: "gravelLevel",
  type: "choice",
  question: "Quel est ton niveau en gravel ?",
  scaleMax: 4,
  scored: false,
  options: TERRAIN_OPTIONS.map((o) =>
    o.value === "aucun" ? { ...o, label: "Je ne fais pas de gravel" } : o
  ),
};

export const VTT_COMPAT_QUESTION: CompatQuestion = {
  key: "vttLevel",
  type: "choice",
  question: "Quel est ton niveau en VTT ?",
  scaleMax: 4,
  scored: false,
  options: TERRAIN_OPTIONS.map((o) =>
    o.value === "aucun" ? { ...o, label: "Je ne fais pas de VTT" } : o
  ),
};

export const ITINERARY_QUESTION_KEY = "itineraire";

/**
 * Posée en tout premier, uniquement quand l'évènement propose plusieurs
 * parcours : les réponses suivantes (dénivelé, revêtement) dépendent du tracé.
 *
 * Volontairement **non enregistrée** dans le profil : elle est propre à cet
 * évènement, pas au profil cycliste réutilisé partout ailleurs.
 */
export function getItineraryQuestion(eventName: string, routes: CompatRoute[]): CompatQuestion {
  return {
    key: ITINERARY_QUESTION_KEY,
    type: "choice",
    question: `Quel itinéraire de ${eventName} t'intéresse ?`,
    scaleMax: 1,
    scored: false,
    options: routes.map((r) => ({ value: r.name, label: r.name, level: 0 })),
  };
}

function matchesGravel(route: CompatRoute) {
  return route.bikeTypes.includes("Gravel");
}

function matchesVtt(route: CompatRoute) {
  return route.bikeTypes.includes("VTT");
}

/**
 * Les questions à poser pour cet évènement, dans l'ordre : itinéraire (si
 * plusieurs parcours) → socle commun → gravel/VTT en complément, seulement si
 * le parcours concerné emprunte ce revêtement.
 *
 * La liste dépend des réponses déjà données : tant que l'itinéraire n'est pas
 * choisi, on considère l'ensemble des parcours.
 */
export function getCompatQuestions(
  eventName: string,
  routes: CompatRoute[],
  answers: CompatAnswers = {}
): CompatQuestion[] {
  const selected = answers[ITINERARY_QUESTION_KEY]
    ? routes.find((r) => r.name === answers[ITINERARY_QUESTION_KEY])
    : null;
  const relevant = selected ? [selected] : routes;

  const list: CompatQuestion[] = [];
  if (routes.length > 1) list.push(getItineraryQuestion(eventName, routes));
  list.push(...BASE_COMPAT_QUESTIONS);
  if (relevant.some(matchesGravel)) list.push(GRAVEL_COMPAT_QUESTION);
  if (relevant.some(matchesVtt)) list.push(VTT_COMPAT_QUESTION);
  return list;
}

export function findCompatQuestion(key: string): CompatQuestion | null {
  return (
    BASE_COMPAT_QUESTIONS.find((q) => q.key === key) ??
    [GRAVEL_COMPAT_QUESTION, VTT_COMPAT_QUESTION].find((q) => q.key === key) ??
    null
  );
}

/**
 * L'« option » correspondant à une réponse. Pour la question à curseur il n'y
 * a pas de liste figée : on la dérive de la valeur choisie.
 */
export function resolveCompatAnswer(
  question: CompatQuestion,
  value: string | undefined
): CompatOptionResolved | null {
  if (value === undefined || value === "") return null;
  if (question.type === "slider") return question.resolve(value);
  return question.options.find((o) => o.value === value) ?? null;
}
