import type { SupabaseClient } from "@supabase/supabase-js";
import { PRACTICE_LEVEL_OPTIONS } from "@/lib/profile";
import {
  getOnboardingTier,
  isSimilarTier,
  type CompatTier,
} from "@/lib/compatibility/levels";

/**
 * Les personnes qui se sont dites intéressées par un évènement — c'est-à-dire
 * qui l'ont mis en favori, ce qu'écrit le bouton « Ça m'intéresse ».
 */

export interface InterestedPerson {
  uid: string;
  name: string | null;
  surname: string | null;
  avatarUrl: string | null;
  /** Niveau déclaré à l'inscription (`users.pref2`), `null` s'il manque. */
  level: string | null;
  /** Ville déclarée à l'inscription (`users.ville`), `null` si elle manque. */
  city: string | null;
}

interface InterestedRow {
  uid: string;
  name: string | null;
  surname: string | null;
  avatar_url: string | null;
  niveau: string | null;
  ville: string | null;
}

/**
 * Réservée aux comptes connectés : la fonction SQL n'est pas exécutable par
 * `anon`. Un échec (fonction pas encore déployée, réseau) renvoie une liste
 * vide plutôt qu'une erreur — le bloc dégrade en « personne pour le moment »,
 * il ne casse pas la fiche.
 */
export async function fetchInterestedPeople(
  supabase: SupabaseClient,
  eventId: number
): Promise<InterestedPerson[]> {
  const { data, error } = await supabase.rpc("get_event_interested_people", {
    p_event_id: eventId,
  });

  if (error || !data) return [];

  return (data as InterestedRow[]).map((row) => ({
    uid: row.uid,
    name: row.name,
    surname: row.surname,
    avatarUrl: row.avatar_url,
    level: row.niveau,
    city: row.ville,
  }));
}

/**
 * Le compteur, lui, est public : la fonction est exécutable par `anon`.
 *
 * Il compte des **personnes**, pas des lignes de favoris — `favourite_events`
 * n'a pas de contrainte d'unicité et porte des doublons. `get_event_favourite_counts()`,
 * qui compte les lignes, annonçait onze personnes là où la liste en montrait dix.
 */
export async function fetchInterestedCount(
  supabase: SupabaseClient,
  eventId: number
): Promise<number> {
  const { data, error } = await supabase.rpc("get_event_interested_count", {
    p_event_id: eventId,
  });

  if (error || data == null) return 0;
  return Number(data) || 0;
}

/**
 * Combien d'intéressé·es par palier d'expérience, moi exclue. La clé `null`
 * regroupe celles dont le niveau n'est pas déclaré.
 */
export type InterestedTierCounts = Map<CompatTier | null, number>;

interface LevelCountRow {
  niveau: string | null;
  nb: number;
}

/**
 * Les paliers des personnes intéressées, sans leurs identités — et **sans
 * compte** : exécutable par `anon`, contrairement à la liste des personnes
 * (`get_event_interested_levels`, migration 20261021120100).
 *
 * Elle existe pour ça : déconnectée, `fetchInterestedPeople()` ne renvoie rien,
 * et « X personnes avec une expérience similaire » — la promesse du
 * questionnaire — tombait donc systématiquement à zéro.
 *
 * Le repliage des niveaux déclarés en paliers se fait ici, pas en SQL : c'est
 * `levels.ts` qui décide que `Competition` compte comme `Confirme`, et deux
 * niveaux bruts atterrissent alors sur la même clé — d'où l'accumulation
 * plutôt qu'une affectation.
 */
export async function fetchInterestedTierCounts(
  supabase: SupabaseClient,
  eventId: number
): Promise<InterestedTierCounts> {
  const { data, error } = await supabase.rpc("get_event_interested_levels", {
    p_event_id: eventId,
  });

  const counts: InterestedTierCounts = new Map();
  if (error || !data) return counts;

  for (const row of data as LevelCountRow[]) {
    const tier = getOnboardingTier(row.niveau);
    counts.set(tier, (counts.get(tier) ?? 0) + (Number(row.nb) || 0));
  }
  return counts;
}

/**
 * Combien de personnes « avec une expérience similaire » sont déjà intéressées.
 *
 * En test, voir le niveau des participantes les plus aguerries décourageait
 * plutôt que ça ne rassurait — d'où une sélection, et non le total. Le détail
 * de la règle est dans `levels.ts`.
 *
 * On compte sur l'agrégat et jamais sur la liste des personnes, même connectée :
 * un seul chemin, donc un seul nombre, identique avec et sans compte. Les
 * paliers inconnus sont écartés par `isSimilarTier` — on ne peut rien affirmer
 * de leur expérience.
 */
export function countSimilarPeople(
  counts: InterestedTierCounts,
  myTier: CompatTier | null
): number {
  if (myTier === null) return 0;

  let total = 0;
  for (const [tier, nb] of counts) {
    if (isSimilarTier(myTier, tier)) total += nb;
  }
  return total;
}

/**
 * Le niveau tel qu'il s'affiche aux autres. Les formulaires stockent des
 * valeurs sans accent (`Debutant`, `Intermediaire`…) : elles sont bonnes pour
 * la base, pas pour une phrase. Le féminin est celui de « personne », toujours
 * féminin dans l'app.
 *
 * Les quatre niveaux restent distincts ici : c'est ce que la personne a
 * déclaré, on ne le réinterprète pas. Le repliage en paliers d'expérience est
 * un besoin du score d'adéquation, pas de cette liste.
 */
const PRACTICE_LEVEL_LABELS: Record<(typeof PRACTICE_LEVEL_OPTIONS)[number], string> = {
  Debutant: "débutante",
  Intermediaire: "intermédiaire",
  Confirme: "confirmée",
  Competition: "compétition",
};

/** `null` quand le niveau n'est pas déclaré, ou n'est pas dans le catalogue. */
export function getPersonLevelLabel(person: InterestedPerson): string | null {
  const value = person.level?.trim();
  if (!value) return null;
  return PRACTICE_LEVEL_LABELS[value as keyof typeof PRACTICE_LEVEL_LABELS] ?? null;
}

export function getPersonCity(person: InterestedPerson): string | null {
  return person.city?.trim() || null;
}

/**
 * Le prénom, puis le nom de famille réduit à son initiale — « Camille D. ».
 *
 * La feuille est une liste de personnes réelles ouverte à tout compte connecté :
 * le prénom suffit à se reconnaître entre membres, le nom entier en ferait un
 * annuaire. Un nom composé garde une seule initiale, celle du champ entier.
 */
export function getPersonDisplayName(person: InterestedPerson): string {
  const surname = person.surname?.trim();
  const initial = surname ? `${Array.from(surname)[0].toUpperCase()}.` : null;
  const full = [person.name?.trim() || null, initial].filter(Boolean).join(" ").trim();
  return full || "Un·e membre";
}
