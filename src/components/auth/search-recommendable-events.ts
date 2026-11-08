"use server";

import { createClient } from "@/lib/supabase/server";

export type RecommendableEvent = {
  id: number;
  nomEvent: string | null;
  image: string | null;
  /** Distingue les éditions d'un même évènement annuel dans la recherche. */
  dateEvent?: string | null;
};

const MAX_RESULTS = 12;

/**
 * `ilike` prend le motif tel quel : `%` et `_` saisis par l'utilisatrice
 * seraient interprétés comme des jokers et feraient remonter n'importe quoi.
 */
function escapeLikePattern(value: string) {
  return value.replace(/[%_\\]/g, (match) => `\\${match}`);
}

// Côté serveur : le navigateur ne lit plus la table events (anti-scraping).
// Bornes appliquées ici, pas seulement dans le composant.
export async function searchRecommendableEvents(
  rawQuery: string
): Promise<RecommendableEvent[]> {
  const query = String(rawQuery ?? "").trim().slice(0, 80);
  if (query.length < 2) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, nomEvent, image, dateEvent")
    .eq("verifie", true)
    .ilike("nomEvent", `%${escapeLikePattern(query)}%`)
    .order("dateEvent", { ascending: false })
    .limit(MAX_RESULTS);

  return (data as RecommendableEvent[] | null) ?? [];
}
