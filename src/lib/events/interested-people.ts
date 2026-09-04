import type { SupabaseClient } from "@supabase/supabase-js";
import { PRACTICE_LEVEL_OPTIONS } from "@/lib/profile";

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

export function getPersonDisplayName(person: InterestedPerson): string {
  const full = [person.name, person.surname].filter(Boolean).join(" ").trim();
  return full || "Un·e membre";
}
