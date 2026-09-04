import {
  BASE_COMPAT_QUESTIONS,
  getCompatQuestions,
  ITINERARY_QUESTION_KEY,
  resolveCompatAnswer,
  type CompatAnswers,
  type CompatRoute,
} from "@/lib/compatibility/questions";

/**
 * Le calcul du score d'adéquation, porté du prototype
 * (`assets/js/data.js`, `getEventCompatProfile` / `computeCompatibility`).
 *
 * Deux sorties bien distinctes, à ne pas confondre :
 *
 *   - `computeCompatibility()` note l'adéquation **à cet évènement** (0 à 10).
 *     Elle sature — presque tout le monde finit au-dessus de 9 sur un même
 *     évènement — et ne sépare donc pas les profils ;
 *   - `getProfileScore()` situe la personne sur une échelle d'expérience
 *     **1 à 4**, indépendante de l'évènement. C'est elle, et elle seule, qui
 *     sert à apparier les personnes (voir `levels.ts`).
 */

/**
 * Les réponses ramenées sur l'échelle commune 1-4, puis moyennées.
 *
 * Chaque question a son propre nombre d'échelons (5 pour la durée de sortie,
 * 4 pour les deux autres) : `1 + (échelon − 1) × 3/(échelons − 1)` les remet
 * toutes sur la même règle. Seules les questions du socle comptent — le
 * revêtement dit ce qu'on pratique, pas jusqu'où on va.
 */
export function getProfileScore(answers: CompatAnswers | null | undefined): number | null {
  if (!answers) return null;

  const scores = BASE_COMPAT_QUESTIONS.filter((q) => q.scored)
    .map((q) => {
      const option = resolveCompatAnswer(q, answers[q.key]);
      if (!option || option.level < 1) return null;
      return 1 + ((option.level - 1) * 3) / (q.scaleMax - 1);
    })
    .filter((value): value is number => value !== null);

  if (scores.length === 0) return null;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

export interface CompatEventInput {
  name: string;
  description: string | null;
  /** Durée de l'évènement en jours, départ et arrivée inclus. */
  durationDays: number | null;
  /** Kilométrage annoncé sur l'évènement, champ libre (« 180 », « 250 / 500 »). */
  distance: string | null;
  routes: CompatRoute[];
}

export interface EventCompatProfile {
  /** Palier de dénivelé de l'évènement, 1 (accessible) à 4 (très engagé). */
  denivele: number;
  isGravel: boolean;
  isVtt: boolean;
  terrainTier: number;
  kmPerDay: number;
  /**
   * Ce que l'évènement demande d'endurance, sur l'échelle de la question
   * « ta plus longue sortie d'une traite » (1 = moins de 4 h, 5 = plusieurs
   * jours d'affilée). Voir `getDurationTier`.
   */
  durationTier: number;
  /** 1 = solo/autonomie, 3 = format collectif. */
  social: number;
}

/**
 * `events.distance` est un champ libre : « 180 », « 180 km », mais aussi
 * « 250 / 500 / 800 km », qui décrit trois parcours au choix. Dans ce dernier
 * cas aucune valeur ne vaut pour l'évènement — on ne retient donc une distance
 * que si le champ n'en porte qu'une, comme pour le rythme « km par jour » de
 * la timeline (voir `event-key-dates.ts`).
 */
function parseSingleDistance(distance: string | null): number | null {
  if (!distance) return null;
  const matches = distance.match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length !== 1) return null;
  const value = Number.parseFloat(matches[0].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Vitesse moyenne, seulement pour estimer la durée d'un évènement d'un jour. */
const ESTIMATED_SPEED_KMH = 20;

/**
 * Ce que l'évènement demande d'endurance, sur l'échelle de la question « ta
 * plus longue sortie d'une traite ».
 *
 * La durée est une donnée à part entière, pas une conséquence du kilométrage :
 * un évènement de deux jours demande d'enchaîner deux jours, même si chacun
 * couvre une distance déjà familière. Elle vient donc des **dates**.
 *
 * Les kilomètres ne servent qu'à trancher **sous la journée**, là où les dates
 * ne disent plus rien : `dateEvent` et `dateFin` ne distinguent pas une sortie
 * de trois heures d'une sortie de douze. On estime alors la durée à
 * 20 km/h — faute de mieux, et sur ce seul cas.
 */
function getDurationTier(days: number, kmPerDay: number): number {
  // Plusieurs jours : c'est l'enchaînement qui est demandé, la distance
  // quotidienne n'y change rien.
  if (days > 1) return 5;

  const hours = kmPerDay / ESTIMATED_SPEED_KMH;
  if (hours > 12) return 4; // une longue journée
  if (hours > 8) return 3; // une journée
  if (hours > 4) return 2; // une demi-journée
  return 1; // moins de 4 h
}

/**
 * Le profil de l'évènement, critère par critère, déduit des données déjà
 * saisies. `answers.itineraire` sélectionne le parcours quand il y en a
 * plusieurs ; à défaut on retombe sur le dernier, comportement du prototype
 * (les parcours sont saisis du plus court au plus long).
 */
export function getEventCompatProfile(
  event: CompatEventInput,
  answers: CompatAnswers = {}
): EventCompatProfile {
  const chosen = answers[ITINERARY_QUESTION_KEY]
    ? event.routes.find((r) => r.name === answers[ITINERARY_QUESTION_KEY])
    : null;
  const route = chosen ?? event.routes[event.routes.length - 1] ?? null;

  const days = event.durationDays && event.durationDays > 0 ? event.durationDays : 1;

  const elevationPerDay = (route?.elevationM ?? 0) / days;
  const denivele =
    elevationPerDay > 3500 ? 4 : elevationPerDay > 2000 ? 3 : elevationPerDay > 1000 ? 2 : 1;

  const surface = (route?.surface ?? "").toLowerCase();
  const isGravel = /gravel|mixte/.test(surface);
  const isVtt = /vtt|mixte/.test(surface);
  // Simplification reprise du proto : un parcours gravel/VTT est considéré
  // « intermédiaire », le champ ne dit pas à quel point le terrain est engagé.
  const terrainTier = 2;

  const km = route?.distanceKm ?? parseSingleDistance(event.distance) ?? 0;
  const kmPerDay = Math.round(km / days) || 0;

  const soloText = `${event.name} ${event.description ?? ""}`.toLowerCase();
  const social = /autonomie/.test(soloText) ? 1 : 3;

  return {
    denivele,
    isGravel,
    isVtt,
    terrainTier,
    kmPerDay,
    durationTier: getDurationTier(days, kmPerDay),
    social,
  };
}

export interface CompatCriterion {
  key: string;
  label: string;
  /** `null` tant que la question qui l'alimente n'a pas de réponse. */
  score: number | null;
  /**
   * Le conseil, affiché seulement quand le critère est sous le seuil. Un
   * critère acquis ne dit rien : il disparaît simplement de la liste.
   */
  gapText: string;
}

export interface CompatResult {
  /** Moyenne sur 10, `null` tant que rien n'est répondu. */
  overall: number | null;
  criteria: CompatCriterion[];
  complete: boolean;
}

function levelScore(userLevel: number, eventTier: number): number {
  const diff = userLevel - eventTier;
  if (diff >= 1) return 10;
  if (diff === 0) return 9;
  if (diff === -1) return 6.5;
  return 3;
}

/**
 * Le conseil de durée nomme ce qu'il faut aller chercher — « la journée
 * entière », « plusieurs jours » — plutôt que de renvoyer à un kilométrage :
 * c'est le temps passé en selle qui manque, pas les kilomètres.
 */
function durationGapText(tier: number): string {
  if (tier >= 5) return "Plusieurs jours d'affilée : entraîne-toi à enchaîner deux sorties sur deux jours.";
  if (tier === 4) return "Une longue journée en selle : entraîne-toi à rouler du matin au soir.";
  if (tier === 3) return "Une journée entière en selle : entraîne-toi à rouler sur la journée complète.";
  return "Une demi-journée en selle : allonge un peu tes sorties.";
}

export function computeCompatibility(
  event: CompatEventInput,
  answers: CompatAnswers = {}
): CompatResult {
  const profile = getEventCompatProfile(event, answers);
  const questions = getCompatQuestions(event.name, event.routes, answers);
  const answerFor = (key: string) => {
    const question = questions.find((q) => q.key === key);
    return question ? resolveCompatAnswer(question, answers[key]) : null;
  };

  const sortie = answerFor("sortieHeures");
  const distance = answerFor("distanceMax");
  const denivele = answerFor("deniveleMax");
  const gravel = answerFor("gravelLevel");
  const vtt = answerFor("vttLevel");

  const deniveleScore = denivele ? levelScore(denivele.level, profile.denivele) : null;

  // Revêtement : une épreuve 100 % route reste accessible quel que soit le
  // niveau gravel ou VTT déclaré — d'où un score acquis d'avance.
  let revetementScore: number | null = null;
  let revetementLabel = "route";
  if (profile.isGravel && profile.isVtt) {
    revetementLabel = "mixte (gravel/VTT)";
    if (gravel && vtt) {
      revetementScore =
        (levelScore(gravel.level, profile.terrainTier) +
          levelScore(vtt.level, profile.terrainTier)) /
        2;
    }
  } else if (profile.isGravel) {
    revetementLabel = "gravel";
    if (gravel) revetementScore = levelScore(gravel.level, profile.terrainTier);
  } else if (profile.isVtt) {
    revetementLabel = "VTT";
    if (vtt) revetementScore = levelScore(vtt.level, profile.terrainTier);
  } else {
    revetementScore = 9.5;
  }

  // Distance et durée sont deux questions distinctes, et deux conseils
  // distincts. Les moyenner laissait passer le cas qui compte le plus : avoir
  // déjà couvert la distance d'une étape ne dit pas qu'on sait enchaîner deux
  // jours, et la moyenne effaçait le manque derrière un kilométrage familier.
  const distanceScore =
    distance && distance.km !== undefined
      ? profile.kmPerDay <= distance.km
        ? 9.5
        : Math.max(3, 9.5 - (profile.kmPerDay - distance.km) / 20)
      : null;

  const durationScore = sortie ? levelScore(sortie.level, profile.durationTier) : null;

  const criteria: CompatCriterion[] = [
    {
      key: "denivele",
      label: "Dénivelé",
      score: deniveleScore,
      gapText:
        "Dénivelé important : fais quelques sorties en montagne pour t'habituer à ce terrain.",
    },
    {
      key: "revetement",
      label: "Revêtement",
      score: revetementScore,
      gapText: `Itinéraire principalement ${revetementLabel} : faisable, mais essaye d'abord quelques sorties pour tester.`,
    },
    {
      key: "distance",
      label: "Distance",
      score: distanceScore,
      gapText: `${profile.kmPerDay} km/j env. : allonge tes sorties pour t'habituer à cette distance.`,
    },
    {
      key: "duree",
      label: "Durée",
      score: durationScore,
      gapText: durationGapText(profile.durationTier),
    },
  ];

  const answered = criteria.filter((c) => c.score !== null);
  // Dénominateur fixe (tous les critères, pas seulement ceux déjà répondus) :
  // chaque réponse ne peut qu'ajouter des points, jamais faire reculer la
  // moyenne — c'est ce qui permet au « chemin » de n'avancer que vers l'avant.
  // Une fois le profil complet, les deux dénominateurs sont égaux.
  const overall = answered.length
    ? answered.reduce((sum, c) => sum + (c.score ?? 0), 0) / criteria.length
    : null;

  return {
    overall,
    criteria,
    complete: questions.every((q) => Boolean(answers[q.key])),
  };
}
