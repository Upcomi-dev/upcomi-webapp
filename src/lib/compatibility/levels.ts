import { PRACTICE_LEVEL_OPTIONS } from "@/lib/profile";

/**
 * Le pont entre le niveau déclaré à l'onboarding (`users.pref2`) et les
 * réponses au questionnaire d'adéquation.
 *
 * Le prototype compare les réponses des membres entre elles : chaque personne
 * y porte un profil cycliste complet. Ici, les autres membres n'ont qu'un
 * niveau déclaré à l'inscription — le questionnaire est neuf, personne n'y a
 * répondu. Il faut donc ramener les deux sur une même échelle.
 *
 * Trois paliers, et non quatre : `Competition` est rangé avec `Confirme`.
 * Presque personne ne coche « compétition » alors que la pratique réelle y
 * correspond souvent, et un palier que personne ne peuple ne sert qu'à isoler
 * les rares qui l'ont coché.
 *
 * Les seuils sont volontairement **tassés vers le bas**, pour la même raison :
 * on se sous-déclare à l'inscription, et l'appariement doit compenser plutôt
 * qu'entériner.
 */

export const COMPAT_TIERS = {
  DEBUTANT: 1,
  INTERMEDIAIRE: 2,
  CONFIRME: 3,
} as const;

export type CompatTier = (typeof COMPAT_TIERS)[keyof typeof COMPAT_TIERS];

/**
 * Niveau déclaré à l'onboarding → palier.
 *
 * `Competition` et `Confirme` tombent sur le même palier (voir plus haut).
 */
const ONBOARDING_LEVEL_TIERS: Record<(typeof PRACTICE_LEVEL_OPTIONS)[number], CompatTier> = {
  Debutant: COMPAT_TIERS.DEBUTANT,
  Intermediaire: COMPAT_TIERS.INTERMEDIAIRE,
  Confirme: COMPAT_TIERS.CONFIRME,
  Competition: COMPAT_TIERS.CONFIRME,
};

/** `null` quand le niveau n'a pas été déclaré, ou n'est pas dans le catalogue. */
export function getOnboardingTier(practiceLevel: string | null | undefined): CompatTier | null {
  const value = practiceLevel?.trim();
  if (!value) return null;
  return ONBOARDING_LEVEL_TIERS[value as keyof typeof ONBOARDING_LEVEL_TIERS] ?? null;
}

/**
 * Seuils de classement d'un score de questionnaire (échelle 1 à 4, moyenne des
 * trois questions de base) vers un palier.
 *
 * Ils ne sont pas répartis régulièrement : ce sont les bornes basses des
 * fourchettes déclarées, pas les milieux d'un découpage en trois.
 *
 *   - `DEBUTANT` s'arrête à 1,45 — au-delà, au moins deux réponses sont déjà
 *     sorties du plus bas échelon, ce qui n'est plus une débutante ;
 *   - `CONFIRME` commence à 2,75, et non à 3 : « plus de 8 h de selle,
 *     200 km, 2000 m D+ » vaut 2,83 sur cette échelle et doit y tomber.
 */
export const TIER_THRESHOLDS = {
  INTERMEDIAIRE: 1.45,
  CONFIRME: 2.75,
} as const;

export function getTierForScore(score: number | null): CompatTier | null {
  if (score === null || !Number.isFinite(score)) return null;
  if (score >= TIER_THRESHOLDS.CONFIRME) return COMPAT_TIERS.CONFIRME;
  if (score >= TIER_THRESHOLDS.INTERMEDIAIRE) return COMPAT_TIERS.INTERMEDIAIRE;
  return COMPAT_TIERS.DEBUTANT;
}

/**
 * Deux personnes ont une « expérience similaire » quand leurs paliers se
 * touchent — les fourchettes de pratique se chevauchent d'un palier à l'autre,
 * elles ne se suivent pas bout à bout.
 *
 *   moi ↓ / elle →   Débutant   Intermédiaire   Confirmé
 *   Débutant            oui         oui           non
 *   Intermédiaire       oui         oui           oui
 *   Confirmé            non         oui           oui
 *
 * Une débutante ne croise donc jamais le peloton de tête : voir le niveau des
 * plus aguerries décourage plus que ça ne rassure (constat du prototype).
 * Symétriquement, un palier inconnu n'entre jamais dans la sélection — il
 * reste compté dans le total des intéressé·es, mais on ne peut rien affirmer
 * de son expérience.
 */
export const SIMILAR_TIER_TOLERANCE = 1;

export function isSimilarTier(mine: CompatTier | null, theirs: CompatTier | null): boolean {
  if (mine === null || theirs === null) return false;
  return Math.abs(mine - theirs) <= SIMILAR_TIER_TOLERANCE;
}

export const TIER_LABELS: Record<CompatTier, string> = {
  [COMPAT_TIERS.DEBUTANT]: "débutante",
  [COMPAT_TIERS.INTERMEDIAIRE]: "intermédiaire",
  [COMPAT_TIERS.CONFIRME]: "confirmée",
};
