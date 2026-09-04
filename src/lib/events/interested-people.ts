import type { SupabaseClient } from "@supabase/supabase-js";
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
  /** Palier déduit du niveau déclaré à l'inscription, `null` s'il manque. */
  tier: CompatTier | null;
}

interface InterestedRow {
  uid: string;
  name: string | null;
  surname: string | null;
  avatar_url: string | null;
  niveau: string | null;
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
    tier: getOnboardingTier(row.niveau),
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
 * compte** : c'est la seule des trois lectures qui soit exécutable par `anon`
 * avec la liste des personnes (`get_event_interested_levels`, migration
 * 20260904170000).
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

export function getPersonDisplayName(person: InterestedPerson): string {
  const full = [person.name, person.surname].filter(Boolean).join(" ").trim();
  return full || "Un·e membre";
}

export function getPersonInitials(person: InterestedPerson): string {
  const initials = [person.name, person.surname]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim()[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}
