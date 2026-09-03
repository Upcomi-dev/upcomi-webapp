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
 * Le nombre de personnes qu'on montre d'un coup dans la feuille. Au-delà, la
 * liste devient un annuaire — mais le **compteur**, lui, n'est jamais plafonné :
 * annoncer « 8 personnes » quand il y en a trente rendrait le chiffre faux au
 * moment précis où il rassure.
 */
export const SIMILAR_PEOPLE_LIMIT = 8;

/**
 * Les personnes « avec une expérience similaire » parmi les intéressé·es,
 * les plus proches d'abord.
 *
 * En test, voir le niveau des participantes les plus aguerries décourageait
 * plutôt que ça ne rassurait — d'où une sélection, jamais la liste complète
 * classée par niveau. Le détail de la règle est dans `levels.ts`.
 */
export function getSimilarPeople(
  people: InterestedPerson[],
  myTier: CompatTier | null,
  excludeUid?: string | null
): InterestedPerson[] {
  if (myTier === null) return [];

  return people
    .filter((person) => person.uid !== excludeUid && isSimilarTier(myTier, person.tier))
    .sort((a, b) => {
      const da = Math.abs((a.tier ?? myTier) - myTier);
      const db = Math.abs((b.tier ?? myTier) - myTier);
      return da - db;
    });
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
