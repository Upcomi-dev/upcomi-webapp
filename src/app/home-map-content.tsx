import { createClient } from "@/lib/supabase/server";
import { buildEventTypeOptions } from "@/lib/events/filter-options";
import type { CollectionWithEvents, MapEvent } from "@/lib/types/database";
import { getLocalDateKey } from "@/lib/utils/event-dates";
import { MapPageClient } from "./map-page-client";

const FILTER_KEYS = [
  "bike_type",
  "type_event",
  "distance",
  "region",
  "budget",
  "date_from",
  "date_to",
  "mint",
  "show_past",
  "q",
] as const;

const POPULAR_COLLECTION_LIMIT = 10;
const MAP_EVENT_SELECT =
  "id, nomEvent, latitude, longitude, bike_type, type_event, dateEvent, dateFin, image, distance, distance_range_filter, region, budget, villeDepart, paysDepart, organisateur, mint";

export type HomeSearchParams = Record<string, string | string[] | undefined>;

interface HomeMapContentProps {
  params: HomeSearchParams;
}

export async function HomeMapContent({ params }: HomeMapContentProps) {
  const supabase = await createClient();
  const today = getLocalDateKey();
  const includePastEvents = params.show_past === "true";
  const searchQuery = getSearchQuery(params);

  const hasFilters = FILTER_KEYS.some((key) => {
    const val = params[key];
    return typeof val === "string" && val.length > 0;
  });

  let eventTypeQuery = supabase
    .from("events")
    .select("type_event")
    .not("type_event", "is", null)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .not("dateEvent", "is", null)
    .eq("verifie", true);

  if (!includePastEvents) {
    eventTypeQuery = eventTypeQuery.or(`dateFin.gte.${today},and(dateFin.is.null,dateEvent.gte.${today})`);
  }

  const [
    eventsResult,
    { data: eventTypeRows },
  ] = await Promise.all([
    buildEventsQuery(supabase, params, today, includePastEvents, Boolean(searchQuery)),
    eventTypeQuery,
  ]);

  let events = eventsResult.data;
  let error = eventsResult.error;

  if (error && searchQuery && isMissingTextSearchMigrationError(error)) {
    const retryResult = await buildEventsQuery(supabase, params, today, includePastEvents, false);
    events = retryResult.data;
    error = retryResult.error;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Impossible de charger les événements
          </h1>
          <p className="mt-2 text-muted-foreground">
            Réessayez dans quelques instants.
          </p>
        </div>
      </div>
    );
  }

  const allEvents = (events as MapEvent[]) || [];
  const eventTypeOptions = buildEventTypeOptions(
    (eventTypeRows || []).map((row) => row.type_event)
  );

  let collections: CollectionWithEvents[] = [];
  if (!hasFilters) {
    collections = await fetchCollections(supabase, allEvents);
  }

  return (
    <MapPageClient
      initialEvents={allEvents}
      collections={collections}
      hasFilters={hasFilters}
      eventTypeOptions={eventTypeOptions}
    />
  );
}

function buildEventsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: HomeSearchParams,
  today: string,
  includePastEvents: boolean,
  includeTextSearch: boolean
) {
  let query = supabase
    .from("events")
    .select(MAP_EVENT_SELECT)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .not("dateEvent", "is", null)
    .eq("verifie", true);

  if (!includePastEvents) {
    query = query.or(`dateFin.gte.${today},and(dateFin.is.null,dateEvent.gte.${today})`);
  }

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
    query = query.or(`dateFin.gte.${dateFrom},and(dateFin.is.null,dateEvent.gte.${dateFrom})`);
  }

  const dateTo = typeof params.date_to === "string" ? params.date_to : null;
  if (dateTo) {
    query = query.lte("dateEvent", dateTo);
  }

  const mintFilter = typeof params.mint === "string" ? params.mint : null;
  if (mintFilter === "true") {
    query = query.eq("mint", true);
  }

  const searchQuery = getSearchQuery(params);
  if (includeTextSearch && searchQuery) {
    query = query.textSearch("search_fts", searchQuery, {
      config: "public.upcomi_unaccent",
      type: "websearch",
    });
  }

  return query;
}

function getSearchQuery(params: HomeSearchParams) {
  return typeof params.q === "string" ? params.q.trim().slice(0, 120) : null;
}

function isMissingTextSearchMigrationError(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.message?.includes("search_fts") === true ||
    error.message?.includes("upcomi_unaccent") === true
  );
}

async function fetchCollections(
  supabase: Awaited<ReturnType<typeof createClient>>,
  allEvents: MapEvent[]
): Promise<CollectionWithEvents[]> {
  const results: CollectionWithEvents[] = [];

  const { data: collectionsData } = await supabase
    .from("collections")
    .select("*")
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (!collectionsData || collectionsData.length === 0) return results;

  const manualCollections = collectionsData.filter((c) => !c.is_auto);
  const autoCollections = collectionsData.filter((c) => c.is_auto);

  for (const col of autoCollections) {
    if (col.auto_type === "popular") {
      const { data: popularData } = await supabase.rpc("get_popular_events", {
        p_limit: POPULAR_COLLECTION_LIMIT,
      });

      const eventIds: number[] = [...((popularData || []) as Array<{ event_id: number; fav_count: number }>)]
        .filter((row) => Number(row.fav_count) > 0)
        .sort((a, b) => Number(b.fav_count) - Number(a.fav_count))
        .slice(0, POPULAR_COLLECTION_LIMIT)
        .map((r) => r.event_id);

      const collectionEvents = eventIds
        .map((id) => allEvents.find((e) => e.id === id))
        .filter((e): e is MapEvent => e != null);

      results.push({ ...col, events: collectionEvents });
    }
  }

  if (manualCollections.length > 0) {
    const today = getLocalDateKey();
    const manualIds = manualCollections.map((c) => c.id);
    const { data: junctionData } = await supabase
      .from("collection_events")
      .select("collection_id, event_id")
      .in("collection_id", manualIds)
      .order("order", { ascending: true });

    const allManualEventIds = [...new Set((junctionData || []).map((j) => j.event_id as number))];

    const manualEventsMap = new Map<number, MapEvent>();
    if (allManualEventIds.length > 0) {
      const { data: manualEventsData } = await supabase
        .from("events")
        .select(MAP_EVENT_SELECT)
        .in("id", allManualEventIds)
        .eq("verifie", true)
        .not("dateEvent", "is", null)
        .or(`dateFin.gte.${today},and(dateFin.is.null,dateEvent.gte.${today})`);

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
