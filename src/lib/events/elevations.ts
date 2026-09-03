import type { createClient } from "@/lib/supabase/server";

/**
 * PostgREST passe les identifiants dans l'URL : au-delà de quelques centaines,
 * la requête devient trop longue. On la découpe.
 */
const ID_CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Dénivelé le plus élevé de chaque évènement, tous parcours confondus.
 *
 * Le dénivelé vit sur `sous_events`, pas sur `events` : pour l'afficher sur les
 * cartes il faut le remonter à part. Une seule requête à deux colonnes par
 * paquet d'identifiants, réduite ici — plutôt qu'une fonction SQL dédiée, dont
 * la migration n'apporterait rien à ce volume.
 *
 * Une erreur de lecture est traitée comme « dénivelé inconnu » : c'est un
 * repère secondaire, il n'a pas à faire tomber une liste d'évènements.
 */
export async function fetchEventMaxElevations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventIds: number[]
): Promise<Map<number, number>> {
  const maxima = new Map<number, number>();
  if (eventIds.length === 0) return maxima;

  const results = await Promise.all(
    chunk([...new Set(eventIds)], ID_CHUNK_SIZE).map((ids) =>
      supabase.from("sous_events").select("event_id, elevation").in("event_id", ids)
    )
  );

  for (const { data, error } of results) {
    if (error || !data) continue;
    for (const row of data as { event_id: number | null; elevation: number | null }[]) {
      if (row.event_id == null) continue;
      if (typeof row.elevation !== "number" || row.elevation <= 0) continue;
      const current = maxima.get(row.event_id);
      if (current == null || row.elevation > current) {
        maxima.set(row.event_id, row.elevation);
      }
    }
  }

  return maxima;
}
