import type { SupabaseClient } from "@supabase/supabase-js";

/** Only aggregate counts cross the API boundary, never other members' drafts. */
export async function fetchEventStoryCounts(
  supabase: SupabaseClient,
  eventIds: number[]
): Promise<Map<number, number>> {
  if (eventIds.length === 0) return new Map();

  try {
    const { data, error } = await supabase.rpc("get_event_story_counts", {
      p_event_ids: [...new Set(eventIds)],
    });

    if (error || !data) return new Map();

    return new Map(
      (data as { event_id: number; story_count: number }[]).map((row) => [
        Number(row.event_id),
        Number(row.story_count),
      ])
    );
  } catch {
    // Offline or RPC not deployed yet: keep the onboarding usable.
    return new Map();
  }
}

/** Stable ties follow recommendation order; a valid manual choice takes priority. */
export function selectStoryEvent<T extends { id: number }>(
  events: readonly T[],
  counts: ReadonlyMap<number, number>,
  manualEventId: number | null = null
): T | null {
  const manualEvent = events.find((event) => event.id === manualEventId);
  if (manualEvent) return manualEvent;

  return events.reduce<T | null>((selected, event) => {
    if (!selected || (counts.get(event.id) ?? 0) < (counts.get(selected.id) ?? 0)) {
      return event;
    }
    return selected;
  }, null);
}
