"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { MapEvent } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";

const EventMap = dynamic(
  () => import("@/components/map/event-map").then((mod) => mod.EventMap),
  { ssr: false }
);
import { InlineFilters } from "@/components/events/event-filters";
import { EventCard } from "@/components/events/event-card";
import { EventDetailPanel } from "@/components/events/event-detail-panel";
import { SortControl } from "@/components/events/sort-control";
import { TopNav } from "@/components/layout/top-nav";

interface MapPageClientProps {
  initialEvents: MapEvent[];
}

function MapPageContent({ initialEvents }: MapPageClientProps) {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<MapEvent[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [detailEventId, setDetailEventId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hasFilters =
    searchParams.get("bike_type") ||
    searchParams.get("type_event") ||
    searchParams.get("distance") ||
    searchParams.get("region") ||
    searchParams.get("budget") ||
    searchParams.get("date_from") ||
    searchParams.get("date_to");

  const fetchFiltered = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("events")
      .select(
        "id, nomEvent, latitude, longitude, bike_type, type_event, dateEvent, image, distance_range_filter, region, budget, villeDepart, paysDepart"
      )
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    const bikeTypes = searchParams.get("bike_type")?.split(",").filter(Boolean);
    if (bikeTypes?.length) {
      const bikeFilters = bikeTypes
        .map((t) => `bike_type.ilike.%${t}%`)
        .join(",");
      query = query.or(bikeFilters);
    }

    const eventTypes = searchParams
      .get("type_event")
      ?.split(",")
      .filter(Boolean);
    if (eventTypes?.length) {
      const eventFilters = eventTypes
        .map((t) => `type_event.ilike.%${t}%`)
        .join(",");
      query = query.or(eventFilters);
    }

    const distances = searchParams.get("distance")?.split(",").filter(Boolean);
    if (distances?.length) {
      query = query.overlaps("distance_range_filter", distances);
    }

    const region = searchParams.get("region");
    if (region) {
      query = query.eq("region", region);
    }

    const budget = searchParams.get("budget");
    if (budget) {
      query = query.eq("budget", budget);
    }

    const dateFrom = searchParams.get("date_from");
    if (dateFrom) {
      query = query.gte("dateEvent", dateFrom);
    }

    const dateTo = searchParams.get("date_to");
    if (dateTo) {
      query = query.lte("dateEvent", dateTo);
    }

    const { data, error } = await query;

    if (!error && data) {
      startTransition(() => {
        setEvents(data as MapEvent[]);
      });
    }
    setLoading(false);
  }, [searchParams, startTransition]);

  useEffect(() => {
    if (!hasFilters) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchFiltered();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hasFilters, fetchFiltered]);

  const displayedEvents = hasFilters ? events : initialEvents;
  const sort = searchParams.get("sort");
  const sortedEvents = useMemo(() => {
    const list = [...displayedEvents];

    switch (sort) {
      case "date-asc":
        list.sort((a, b) => {
          const aTime = a.dateEvent ? new Date(a.dateEvent).getTime() : Number.MAX_SAFE_INTEGER;
          const bTime = b.dateEvent ? new Date(b.dateEvent).getTime() : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        });
        break;
      case "date-desc":
        list.sort((a, b) => {
          const aTime = a.dateEvent ? new Date(a.dateEvent).getTime() : 0;
          const bTime = b.dateEvent ? new Date(b.dateEvent).getTime() : 0;
          return bTime - aTime;
        });
        break;
      case "name-asc":
        list.sort((a, b) =>
          (a.nomEvent || "").localeCompare(b.nomEvent || "", "fr", { sensitivity: "base" })
        );
        break;
    }

    // Move selected event to the top
    if (selectedEventId != null) {
      const idx = list.findIndex((e) => e.id === selectedEventId);
      if (idx > 0) {
        const [selected] = list.splice(idx, 1);
        list.unshift(selected);
      }
    }

    return list;
  }, [displayedEvents, sort, selectedEventId]);

  // Scroll to the selected card
  useEffect(() => {
    if (selectedEventId == null || !listRef.current) return;
    const card = listRef.current.querySelector(`[data-event-id="${selectedEventId}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedEventId]);

  const handleEventClick = useCallback((eventId: number) => {
    setDetailEventId(eventId);
    setSelectedEventId(eventId);
  }, []);

  const handleMapEventSelect = useCallback((eventId: number | null) => {
    setSelectedEventId(eventId);
    if (eventId != null) {
      setDetailEventId(eventId);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col md:h-screen">
      <TopNav />

      <div className="relative flex flex-1 flex-col overflow-hidden md:min-h-0 md:grid md:grid-rows-[1fr] md:grid-cols-[minmax(380px,44vw)_minmax(0,1fr)] xl:grid-cols-[520px_minmax(0,1fr)]">
        <aside className="glass-drawer hidden overflow-y-auto border-r border-white/45 md:block">
          <div className="space-y-5 px-4 py-4 md:px-5">
            {detailEventId != null && sortedEvents.find((e) => e.id === detailEventId) ? (
              /* ── Event detail panel ── */
              <EventDetailPanel
                event={sortedEvents.find((e) => e.id === detailEventId)!}
                onBack={() => setDetailEventId(null)}
              />
            ) : (
              /* ── List view ── */
              <>
                <section className="hero-mesh grain-overlay overflow-hidden rounded-[30px] border border-white/45 p-5 shadow-soft-xl">
                  <div className="mb-5">
                    <h1 className="max-w-[18ch] font-serif text-[38px] leading-[0.93] text-foreground text-balance">
                      Trouve le prochain ride qui te ressemble.
                    </h1>
                  </div>

                  <div className="rounded-[26px] border border-white/48 bg-white/34 p-4 shadow-[var(--shadow-sm)]">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
                      Affiner la sélection
                    </p>
                    <InlineFilters />
                  </div>
                </section>

                <section className="rounded-[30px] border border-white/45 bg-white/34 p-4 shadow-[var(--shadow-sm)]">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <h2 className="font-serif text-[24px] leading-none text-foreground">
                      Événements à explorer
                    </h2>
                    <div className="flex items-center gap-2">
                      <SortControl />
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-coral border-t-transparent" />
                    </div>
                  ) : sortedEvents.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-foreground/12 bg-white/36 px-6 py-12 text-center">
                      <p className="text-sm font-semibold text-foreground">Aucun événement</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-foreground/45">
                        Modifie les filtres pour élargir la sélection
                      </p>
                    </div>
                  ) : (
                    <div ref={listRef} className="space-y-3">
                      {sortedEvents.map((event) => (
                        <div key={event.id} data-event-id={event.id}>
                          <EventCard
                            id={event.id}
                            nomEvent={event.nomEvent}
                            dateEvent={event.dateEvent}
                            image={event.image}
                            bike_type={event.bike_type}
                            type_event={event.type_event}
                            villeDepart={event.villeDepart}
                            paysDepart={event.paysDepart}
                            variant="list"
                            isSelected={event.id === selectedEventId}
                            onEventClick={handleEventClick}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </aside>

        <main className="relative min-h-[55vh] min-w-0 flex-1 md:h-full md:min-h-0">
          {(loading || isPending) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/34 backdrop-blur-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-4 top-4 z-10 md:hidden">
            <section className="hero-mesh grain-overlay rounded-[28px] border border-white/48 p-4 shadow-soft-xl">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/42">
                Upcomi atlas
              </p>
              <h1 className="max-w-[16ch] font-serif text-[32px] leading-[0.94] text-foreground text-balance">
                Des événements vélo mieux choisis, mieux présentés.
              </h1>
              <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/50">
                <span>{sortedEvents.length} résultats</span>
              </div>
            </section>
          </div>
          <EventMap
            events={sortedEvents}
            selectedEventId={selectedEventId}
            onEventSelect={handleMapEventSelect}
          />
        </main>
      </div>
    </div>
  );
}

export function MapPageClient({ initialEvents }: MapPageClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        </div>
      }
    >
      <MapPageContent initialEvents={initialEvents} />
    </Suspense>
  );
}
