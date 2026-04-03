"use client";

import { Suspense, useCallback, useMemo, useReducer, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { MapEvent, CollectionWithEvents } from "@/lib/types/database";

const EventMap = dynamic(
  () => import("@/components/map/event-map").then((mod) => mod.EventMap),
  { ssr: false }
);
import { InlineFilters } from "@/components/events/event-filters";
import { EventCard } from "@/components/events/event-card";
import { EventDetailPanel } from "@/components/events/event-detail-panel";
import { SortControl } from "@/components/events/sort-control";
import { TopNav } from "@/components/layout/top-nav";
import { CollectionsView } from "@/components/collections/collections-view";
import { MobileBottomSheet } from "@/components/layout/mobile-bottom-sheet";

/* ── Panel state machine ── */
type PanelMode = "collections" | "filtered" | "detail";

type PanelState = {
  mode: PanelMode;
  detailEventId: number | null;
  selectedEventId: number | null;
  previousMode: PanelMode;
};

type PanelAction =
  | { type: "SELECT_EVENT"; eventId: number }
  | { type: "MAP_SELECT"; eventId: number | null }
  | { type: "BACK_FROM_DETAIL" }
  | { type: "FILTERS_CHANGED"; hasFilters: boolean };

function panelReducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case "SELECT_EVENT":
      return {
        ...state,
        mode: "detail",
        detailEventId: action.eventId,
        selectedEventId: action.eventId,
        previousMode: state.mode === "detail" ? state.previousMode : state.mode,
      };
    case "MAP_SELECT":
      if (action.eventId == null) return { ...state, selectedEventId: null };
      return {
        ...state,
        mode: "detail",
        detailEventId: action.eventId,
        selectedEventId: action.eventId,
        previousMode: state.mode === "detail" ? state.previousMode : state.mode,
      };
    case "BACK_FROM_DETAIL":
      return {
        ...state,
        mode: state.previousMode,
        detailEventId: null,
      };
    case "FILTERS_CHANGED":
      if (state.mode === "detail") return state;
      return {
        ...state,
        mode: action.hasFilters ? "filtered" : "collections",
      };
    default:
      return state;
  }
}

interface MapPageClientProps {
  initialEvents: MapEvent[];
  collections?: CollectionWithEvents[];
  hasFilters?: boolean;
}

function MapPageContent({ initialEvents, collections = [], hasFilters = false }: MapPageClientProps) {
  const searchParams = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);
  const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);
  const [flyToEventId, setFlyToEventId] = useState<number | null>(null);

  const [panel, dispatch] = useReducer(panelReducer, {
    mode: hasFilters ? "filtered" : "collections",
    detailEventId: null,
    selectedEventId: null,
    previousMode: hasFilters ? "filtered" : "collections",
  });

  const sort = searchParams.get("sort");
  const sortedEvents = useMemo(() => {
    const list = [...initialEvents];

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

    if (panel.selectedEventId != null) {
      const idx = list.findIndex((e) => e.id === panel.selectedEventId);
      if (idx > 0) {
        const [selected] = list.splice(idx, 1);
        list.unshift(selected);
      }
    }

    return list;
  }, [initialEvents, sort, panel.selectedEventId]);

  // Scroll to selected card
  const prevSelectedRef = useRef<number | null>(null);
  if (panel.selectedEventId !== prevSelectedRef.current) {
    prevSelectedRef.current = panel.selectedEventId;
    if (panel.selectedEventId != null && listRef.current) {
      const card = listRef.current.querySelector(`[data-event-id="${panel.selectedEventId}"]`);
      card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  const handleEventClick = useCallback((eventId: number) => {
    dispatch({ type: "SELECT_EVENT", eventId });
    setFlyToEventId(eventId);
  }, []);

  const handleMapEventSelect = useCallback((eventId: number | null) => {
    dispatch({ type: "MAP_SELECT", eventId });
  }, []);

  const handleBackFromDetail = useCallback(() => {
    dispatch({ type: "BACK_FROM_DETAIL" });
    setFlyToEventId(null);
  }, []);

  /* ── Panel content renderer ── */
  const renderPanelContent = () => {
    // Detail mode
    if (panel.mode === "detail" && panel.detailEventId != null) {
      const detailEvent = sortedEvents.find((e) => e.id === panel.detailEventId);
      if (detailEvent) {
        return (
          <EventDetailPanel
            event={detailEvent}
            onBack={handleBackFromDetail}
          />
        );
      }
    }

    // Collections mode (no filters)
    if (panel.mode === "collections" && collections.length > 0) {
      return (
        <>
          {/* Hero in collections mode */}
          <section className="hero-mesh grain-overlay overflow-hidden rounded-[30px] border border-white/45 p-5 shadow-soft-xl">
            <div className="mb-5">
              <h1 className="max-w-[18ch] font-serif text-[38px] leading-[0.93] text-foreground text-balance">
                Trouve le prochain ride qui te ressemble.
              </h1>
            </div>
            <div className="mt-4 rounded-[26px] border border-white/48 bg-white/34 p-4 shadow-[var(--shadow-sm)]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
                Affiner la sélection
              </p>
              <InlineFilters />
            </div>
          </section>

          <CollectionsView
            collections={collections}
            onEventClick={handleEventClick}
            onEventHover={setHoveredEventId}
          />
        </>
      );
    }

    // Filtered mode (or fallback when no collections)
    return (
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

          {sortedEvents.length === 0 ? (
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
                    isSelected={event.id === panel.selectedEventId}
                    onEventClick={handleEventClick}
                    onEventHover={setHoveredEventId}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </>
    );
  };

  return (
    <div className="flex min-h-screen flex-col md:h-screen">
      <TopNav />

      <div className="relative flex flex-1 flex-col overflow-hidden md:min-h-0 md:grid md:grid-rows-[1fr] md:grid-cols-[minmax(380px,45vw)_minmax(0,1fr)] xl:grid-cols-[minmax(420px,45vw)_minmax(0,1fr)]">
        {/* Desktop panel */}
        <aside className="glass-drawer hidden overflow-y-auto border-r border-white/45 md:block">
          <div className="space-y-5 px-4 py-4 md:px-5">
            {renderPanelContent()}
          </div>
        </aside>

        {/* Map */}
        <main className="relative min-h-[55vh] min-w-0 flex-1 md:h-full md:min-h-0">
          {/* Mobile hero overlay */}
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

          {/* Mobile bottom sheet */}
          <MobileBottomSheet
            collections={collections}
            events={sortedEvents}
            hasFilters={hasFilters}
            panelMode={panel.mode}
            selectedEventId={panel.selectedEventId}
            detailEventId={panel.detailEventId}
            onEventClick={handleEventClick}
            onBackFromDetail={handleBackFromDetail}
          />

          <EventMap
            events={sortedEvents}
            selectedEventId={panel.selectedEventId}
            hoveredEventId={hoveredEventId}
            dimOtherMarkers={panel.mode === "detail"}
            flyToEventId={flyToEventId}
            onEventSelect={handleMapEventSelect}
          />
        </main>
      </div>
    </div>
  );
}

export function MapPageClient({ initialEvents, collections = [], hasFilters = false }: MapPageClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        </div>
      }
    >
      <MapPageContent initialEvents={initialEvents} collections={collections} hasFilters={hasFilters} />
    </Suspense>
  );
}
