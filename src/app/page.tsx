import { createClient } from "@/lib/supabase/server";
import type { MapEvent, CollectionWithEvents } from "@/lib/types/database";
import { MapPageClient } from "./map-page-client";

export const revalidate = 300;

const FILTER_KEYS = ["bike_type", "type_event", "distance", "region", "budget", "date_from", "date_to"] as const;

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Detect active filters
  const hasFilters = FILTER_KEYS.some((key) => {
    const val = params[key];
    return typeof val === "string" && val.length > 0;
  });

  let query = supabase
    .from("events")
    .select(
      "id, nomEvent, latitude, longitude, bike_type, type_event, dateEvent, image, distance_range_filter, region, budget, villeDepart, paysDepart"
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  const bikeTypes = (typeof params.bike_type === "string" ? params.bike_type : "")
    .split(",")
    .filter(Boolean);
  if (bikeTypes.length) {
    query = query.or(bikeTypes.map((t) => `bike_type.ilike.%${t}%`).join(","));
  }

  const eventTypes = (typeof params.type_event === "string" ? params.type_event : "")
    .split(",")
    .filter(Boolean);
  if (eventTypes.length) {
    query = query.or(eventTypes.map((t) => `type_event.ilike.%${t}%`).join(","));
  }

  const distances = (typeof params.distance === "string" ? params.distance : "")
    .split(",")
    .filter(Boolean);
  if (distances.length) {
    query = query.or(distances.map((d) => `distance_range_filter.ilike.%${d}%`).join(","));
  }

  const region = typeof params.region === "string" ? params.region : null;
  if (region) {
    query = query.eq("region", region);
  }

  const budget = typeof params.budget === "string" ? params.budget : null;
  if (budget) {
    query = query.eq("budget", budget);
  }

  const dateFrom = typeof params.date_from === "string" ? params.date_from : null;
  if (dateFrom) {
    query = query.gte("dateEvent", dateFrom);
  }

  const dateTo = typeof params.date_to === "string" ? params.date_to : null;
  if (dateTo) {
    query = query.lte("dateEvent", dateTo);
  }

  const { data: events, error } = await query;

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Impossible de charger les événements
          </h1>
          <p className="mt-2 text-muted-foreground">Réessayez dans quelques instants.</p>
        </div>
      </div>
    );
  }

  const allEvents = (events as MapEvent[]) || [];

  // Fetch collections only when no filters are active
  let collections: CollectionWithEvents[] = [];
  if (!hasFilters) {
    collections = await fetchCollections(supabase, allEvents);
  }

  return <MapPageClient initialEvents={allEvents} collections={collections} hasFilters={hasFilters} />;
}

async function fetchCollections(
  supabase: Awaited<ReturnType<typeof createClient>>,
  allEvents: MapEvent[]
): Promise<CollectionWithEvents[]> {
  const results: CollectionWithEvents[] = [];

  // Fetch active collections only
  const { data: collectionsData } = await supabase
    .from("collections")
    .select("*")
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (!collectionsData || collectionsData.length === 0) return results;

  // Fetch manual collection events in a single query
  const manualCollections = collectionsData.filter((c) => !c.is_auto);
  const autoCollections = collectionsData.filter((c) => c.is_auto);

  // Handle auto collections (popular)
  for (const col of autoCollections) {
    if (col.auto_type === "popular") {
      const { data: popularData } = await supabase.rpc("get_popular_events", { p_limit: 20 });

      let eventIds: number[] = (popularData || []).map((r: { event_id: number }) => r.event_id);

      // Fallback: if RPC returns nothing, use all events sorted by date
      if (eventIds.length === 0) {
        eventIds = allEvents
          .filter((e) => e.dateEvent)
          .sort((a, b) => new Date(a.dateEvent!).getTime() - new Date(b.dateEvent!).getTime())
          .slice(0, 20)
          .map((e) => e.id);
      }

      const collectionEvents = eventIds
        .map((id) => allEvents.find((e) => e.id === id))
        .filter((e): e is MapEvent => e != null);

      results.push({ ...col, events: collectionEvents });
    }
  }

  // Handle manual collections
  if (manualCollections.length > 0) {
    const manualIds = manualCollections.map((c) => c.id);
    const { data: junctionData } = await supabase
      .from("collection_events")
      .select("collection_id, event_id")
      .in("collection_id", manualIds)
      .order("order", { ascending: true });

    // Gather all event IDs from manual collections
    const allManualEventIds = [...new Set((junctionData || []).map((j) => j.event_id as number))];

    // Fetch these events directly (they may not have coordinates, so not in allEvents)
    let manualEventsMap = new Map<number, MapEvent>();
    if (allManualEventIds.length > 0) {
      const { data: manualEventsData } = await supabase
        .from("events")
        .select("id, nomEvent, latitude, longitude, bike_type, type_event, dateEvent, image, distance_range_filter, region, budget, villeDepart, paysDepart")
        .in("id", allManualEventIds);

      for (const e of (manualEventsData || []) as MapEvent[]) {
        manualEventsMap.set(e.id, e);
      }
    }

    for (const col of manualCollections) {
      const eventIds = (junctionData || [])
        .filter((j) => j.collection_id === col.id)
        .map((j) => j.event_id as number);

      const collectionEvents = eventIds
        .map((id) => manualEventsMap.get(id) || allEvents.find((e) => e.id === id))
        .filter((e): e is MapEvent => e != null);

      results.push({ ...col, events: collectionEvents });
    }
  }

  return results.sort((a, b) => a.order - b.order);
}
