"use client";

import { Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Filter, List, Map as MapIcon, Search, X } from "lucide-react";
import type { MapEvent, CollectionWithEvents } from "@/lib/types/database";
import { buildRelativeUrl, withReturnTo } from "@/lib/utils/navigation";
import { makeEventSlug } from "@/lib/utils/slugify";
import { getEventTypeColor } from "@/lib/types/database";

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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  | { type: "PREVIEW_EVENT"; eventId: number }
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
    case "PREVIEW_EVENT":
      return {
        ...state,
        mode: state.mode === "detail" ? state.previousMode : state.mode,
        detailEventId: null,
        selectedEventId: action.eventId,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);
  const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);
  const [flyToEventId, setFlyToEventId] = useState<number | null>(null);
  const [listReferenceTime] = useState(() => Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [panel, dispatch] = useReducer(panelReducer, {
    mode: hasFilters ? "filtered" : "collections",
    detailEventId: null,
    selectedEventId: null,
    previousMode: hasFilters ? "filtered" : "collections",
  });

  const sort = searchParams.get("sort");
  const eventParam = searchParams.get("event");
  const mobileView = searchParams.get("view") === "map" ? "map" : "list";
  const activeFilterCount = useMemo(() => {
    const keys = ["bike_type", "type_event", "distance", "region", "budget", "date_from", "date_to", "mint"];
    return keys.reduce((count, key) => {
      const value = searchParams.get(key);
      if (!value) return count;
      return count + value.split(",").filter(Boolean).length;
    }, 0);
  }, [searchParams]);
  const clearMobileFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (mobileView === "map") {
      params.set("view", "map");
    }
    const query = params.toString();
    router.push(query ? `/?${query}` : "/", { scroll: false });
  }, [mobileView, router]);
  const setMobileView = useCallback(
    (nextView: "list" | "map") => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextView === "map") {
        params.set("view", "map");
      } else {
        params.delete("view");
      }

      const query = params.toString();
      router.replace(query ? `/?${query}` : "/", { scroll: false });
    },
    [router, searchParams]
  );
  const activeEventTypes = useMemo(
    () => searchParams.get("type_event")?.split(",").filter(Boolean) ?? [],
    [searchParams]
  );
  const routeEventId = useMemo(() => {
    if (!eventParam) return null;
    const parsed = Number(eventParam);
    return Number.isInteger(parsed) ? parsed : null;
  }, [eventParam]);
  const detailEvents = useMemo(() => {
    const eventMap = new Map<number, MapEvent>();

    for (const event of initialEvents) {
      eventMap.set(event.id, event);
    }

    for (const collection of collections) {
      for (const event of collection.events) {
        if (!eventMap.has(event.id)) {
          eventMap.set(event.id, event);
        }
      }
    }

    return Array.from(eventMap.values());
  }, [collections, initialEvents]);

  const toggleMultiFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get(key)?.split(",").filter(Boolean) ?? [];

      if (current.includes(value)) {
        const next = current.filter((item) => item !== value);
        if (next.length > 0) {
          params.set(key, next.join(","));
        } else {
          params.delete(key);
        }
      } else {
        params.set(key, [...current, value].join(","));
      }

      const query = params.toString();
      router.push(query ? `/?${query}` : "/", { scroll: false });
    },
    [router, searchParams]
  );

  const matchesSearch = useCallback(
    (event: MapEvent) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return [event.nomEvent, event.villeDepart, event.paysDepart, event.type_event, event.bike_type]
        .some((field) => field?.toLowerCase().includes(q));
    },
    [searchQuery]
  );

  const sortedEvents = useMemo(() => {
    const list = detailEvents.filter(matchesSearch);

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
  }, [detailEvents, matchesSearch, sort, panel.selectedEventId]);

  const listEvents = useMemo(() => {
    const list = initialEvents
      .filter((event) => {
        if (!event.dateEvent) return false;
        if (new Date(event.dateEvent).getTime() < listReferenceTime) return false;
        return matchesSearch(event);
      });

    switch (sort) {
      case "date-desc":
        list.sort((a, b) => new Date(b.dateEvent!).getTime() - new Date(a.dateEvent!).getTime());
        break;
      case "name-asc":
        list.sort((a, b) =>
          (a.nomEvent || "").localeCompare(b.nomEvent || "", "fr", { sensitivity: "base" })
        );
        break;
      case "date-asc":
      default:
        list.sort((a, b) => new Date(a.dateEvent!).getTime() - new Date(b.dateEvent!).getTime());
        break;
    }

    if (panel.selectedEventId != null) {
      const idx = list.findIndex((event) => event.id === panel.selectedEventId);
      if (idx > 0) {
        const [selected] = list.splice(idx, 1);
        list.unshift(selected);
      }
    }

    return list;
  }, [initialEvents, listReferenceTime, matchesSearch, panel.selectedEventId, sort]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobile(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  // Scroll to selected card after selection changes.
  useEffect(() => {
    if (panel.selectedEventId == null || !listRef.current) return;
    const card = listRef.current.querySelector(`[data-event-id="${panel.selectedEventId}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [panel.selectedEventId]);

  const handleEventClick = useCallback((eventId: number) => {
    dispatch({ type: "SELECT_EVENT", eventId });
    setFlyToEventId(eventId);
  }, []);

  const handleMapEventSelect = useCallback((eventId: number | null) => {
    if (isMobile) {
      if (eventId == null) {
        dispatch({ type: "MAP_SELECT", eventId: null });
        return;
      }

      dispatch({ type: "PREVIEW_EVENT", eventId });
      return;
    }

    dispatch({ type: "MAP_SELECT", eventId });
  }, [isMobile]);

  const handleBackFromDetail = useCallback(() => {
    dispatch({ type: "BACK_FROM_DETAIL" });
    setFlyToEventId(null);
    if (searchParams.get("event")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("event");
      const query = params.toString();
      router.replace(query ? `/?${query}` : "/", { scroll: false });
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (!eventParam) return;

    if (routeEventId == null) return;

    const eventExists = detailEvents.some((event) => event.id === routeEventId);
    if (!eventExists) return;

    dispatch({ type: isMobile ? "PREVIEW_EVENT" : "SELECT_EVENT", eventId: routeEventId });
  }, [detailEvents, eventParam, isMobile, routeEventId]);

  const detailEvent =
    panel.mode === "detail" && panel.detailEventId != null
      ? detailEvents.find((event) => event.id === panel.detailEventId) ?? null
      : null;
  const mobilePreviewEvent =
    panel.selectedEventId != null
      ? detailEvents.find((event) => event.id === panel.selectedEventId) ?? null
      : null;
  const showMobileCollections = !detailEvent && !searchQuery && activeFilterCount === 0 && collections.length > 0;

  /* ── Panel content renderer ── */
  const renderPanelContent = () => {
    // Detail mode
    if (panel.mode === "detail" && panel.detailEventId != null) {
      const detailEvent = detailEvents.find((e) => e.id === panel.detailEventId);
      if (detailEvent) {
        return (
          <EventDetailPanel
            event={detailEvent}
            onBack={handleBackFromDetail}
          />
        );
      }
    }

    // Collections mode (no filters, no search)
    if (panel.mode === "collections" && collections.length > 0 && !searchQuery) {
      return (
        <>
          {/* Hero in collections mode */}
          <section className="hero-mesh grain-overlay overflow-hidden rounded-[30px] border border-white/45 p-5 shadow-soft-xl">
            <div className="mb-5">
              <h1 className="font-serif text-[38px] leading-[0.93] text-foreground">
                Trouve la prochaine aventure<br />qui te ressemble.
              </h1>
            </div>
            <div className="mt-4 rounded-[26px] border border-white/48 bg-white/34 p-4 shadow-[var(--shadow-sm)]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
                Affiner la sélection
              </p>
              <InlineFilters searchValue={searchQuery} onSearchChange={setSearchQuery} />
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
            <h1 className="font-serif text-[38px] leading-[0.93] text-foreground">
              Trouve la prochaine aventure<br />qui te ressemble.
            </h1>
          </div>
          <div className="rounded-[26px] border border-white/48 bg-white/34 p-4 shadow-[var(--shadow-sm)]">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
              Affiner la sélection
            </p>
            <InlineFilters searchValue={searchQuery} onSearchChange={setSearchQuery} />
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

          {listEvents.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-foreground/12 bg-white/36 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">Aucun événement</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-foreground/45">
                Modifie les filtres pour élargir la sélection
              </p>
            </div>
          ) : (
            <div ref={listRef} className="space-y-3">
              {listEvents.map((event) => (
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

  const renderMobileListContent = () => {
    if (detailEvent) {
      return (
        <section className="rounded-[28px] border border-white/45 bg-[linear-gradient(180deg,rgba(255,251,246,0.96),rgba(248,240,230,0.88))] p-4 shadow-[var(--shadow-md)]">
          <EventDetailPanel event={detailEvent} onBack={handleBackFromDetail} />
        </section>
      );
    }

    if (showMobileCollections) {
      return (
        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
              Collections
            </p>
            <h1 className="font-serif text-[28px] leading-none text-foreground">
              Trouve ta prochaine aventure
            </h1>
          </div>

          <CollectionsView
            collections={collections}
            onEventClick={handleEventClick}
            onEventHover={setHoveredEventId}
          />
        </section>
      );
    }

    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
              Vue liste
            </p>
            <h1 className="font-serif text-[28px] leading-none text-foreground">
              {listEvents.length} événements
            </h1>
          </div>
          <SortControl />
        </div>

        {listEvents.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-foreground/12 bg-white/36 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">Aucun événement</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-foreground/45">
              Modifie la recherche ou les filtres
            </p>
          </div>
        ) : (
          <div ref={listRef} className="space-y-3">
            {listEvents.map((event) => (
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
    );
  };

  const renderMobileMapContent = () => {
    return (
      <section className="relative min-h-[calc(100dvh-4.5rem)] overflow-hidden bg-white/40">
        <div className="absolute inset-0">
          <EventMap
            events={sortedEvents}
            selectedEventId={panel.selectedEventId}
            hoveredEventId={hoveredEventId}
            dimOtherMarkers={panel.mode === "detail"}
            flyToEventId={flyToEventId ?? routeEventId}
            activeEventTypes={activeEventTypes}
            onEventSelect={handleMapEventSelect}
            onToggleEventType={(eventType) => toggleMultiFilter("type_event", eventType)}
          />
        </div>

        {mobilePreviewEvent ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-[5.75rem] z-10">
            <MobileEventPreviewCard
              event={mobilePreviewEvent}
              onClose={() => dispatch({ type: "MAP_SELECT", eventId: null })}
            />
          </div>
        ) : null}
      </section>
    );
  };

  const renderMobileContent = () => {
    const mobileSearchBar = (
      <div className="pointer-events-none absolute inset-x-4 top-4 z-10">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[20px] border border-white/55 bg-white/88 px-4 py-3 shadow-[var(--shadow-sm)] backdrop-blur-sm">
            <Search className="h-4 w-4 flex-none text-foreground/38" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Nom, lieu, organisateur..."
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/35"
            />
          </div>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className={cn(
              "inline-flex h-[50px] flex-none items-center gap-2 rounded-[18px] border px-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all backdrop-blur-sm",
              mobileFiltersOpen || activeFilterCount > 0
                ? "border-coral/30 bg-coral text-white shadow-[var(--shadow-sm)]"
                : "border-white/55 bg-white/88 text-foreground/70 shadow-[var(--shadow-sm)]"
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filtres</span>
            {activeFilterCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/18 px-1.5 text-[10px] text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    );

    return (
      <div className="relative px-4 py-4 md:hidden">
        {mobileView === "map" ? (
          <div className="relative -mx-4 -mt-4 min-h-[calc(100dvh-4.5rem)]">
            {renderMobileMapContent()}
            {mobileSearchBar}
          </div>
        ) : (
          <div className="relative -mx-4 -mt-4 pt-[5.5rem]">
            {mobileSearchBar}
            <div className="space-y-4 px-4">
              {renderMobileListContent()}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMobileView(mobileView === "list" ? "map" : "list")}
          className="fixed bottom-5 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-coral px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_30px_rgba(235,95,59,0.32)]"
        >
          {mobileView === "list" ? <MapIcon className="h-4 w-4" /> : <List className="h-4 w-4" />}
          <span>{mobileView === "list" ? "Carte" : "Liste"}</span>
        </button>

        <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <DialogContent
            showCloseButton
            className="top-0 right-0 left-auto h-dvh w-[min(88vw,25rem)] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-l-[28px] border-y-0 border-r-0 bg-[linear-gradient(180deg,rgba(255,251,246,0.98),rgba(248,240,230,0.94))] p-0 shadow-[var(--shadow-lg)]"
          >
            <DialogHeader className="border-b border-white/45 px-5 pb-4 pt-5">
              <DialogTitle className="font-serif text-[24px] font-normal text-foreground">
                Filtres
              </DialogTitle>
              <DialogDescription>
                Affine les événements affichés sur la liste et la carte.
              </DialogDescription>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="overflow-y-auto px-5 py-4">
                <InlineFilters showSearch={false} expandAllPanels variant="drawer" />
              </div>

              <div className="border-t border-white/45 bg-white/72 px-4 py-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={clearMobileFilters}
                    className="rounded-full border border-white/55 bg-white/80 px-5 py-3 text-[13px] font-semibold text-foreground shadow-[var(--shadow-xs)]"
                  >
                    Effacer
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className="flex-1 rounded-full bg-coral px-5 py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(235,95,59,0.28)]"
                  >
                    Afficher la sélection
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col md:h-screen">
      <TopNav />

      {isMobile ? (
        <div className="flex-1 overflow-y-auto">{renderMobileContent()}</div>
      ) : (
        <div className="relative flex flex-1 flex-col overflow-hidden md:min-h-0 md:grid md:grid-rows-[1fr] md:grid-cols-[minmax(380px,45vw)_minmax(0,1fr)] xl:grid-cols-[minmax(420px,45vw)_minmax(0,1fr)]">
        {/* Desktop panel */}
          <aside className="glass-drawer hidden overflow-y-auto border-r border-white/45 md:block">
          <div className="space-y-5 px-4 py-4 md:px-5">
            {renderPanelContent()}
          </div>
          </aside>

        {/* Map */}
          <main className="relative h-full min-h-0 min-w-0 flex-1">
            <EventMap
              events={sortedEvents}
              selectedEventId={panel.selectedEventId}
              hoveredEventId={hoveredEventId}
              dimOtherMarkers={panel.mode === "detail"}
              flyToEventId={flyToEventId ?? routeEventId}
              activeEventTypes={activeEventTypes}
              onEventSelect={handleMapEventSelect}
              onToggleEventType={(eventType) => toggleMultiFilter("type_event", eventType)}
            />
          </main>
        </div>
      )}
    </div>
  );
}

function MobileEventPreviewCard({ event, onClose }: { event: MapEvent; onClose: () => void }) {
  const searchParams = useSearchParams();
  const eventSlug = makeEventSlug(event.id, event.nomEvent);
  const eventHref = withReturnTo(
    `/event/${eventSlug}`,
    buildRelativeUrl("/", searchParams.toString())
  );
  const typeColor = getEventTypeColor(event.type_event);
  const normalizedImage = event.image?.trim() ?? "";
  const hasImage =
    normalizedImage.length > 0 &&
    normalizedImage.toLowerCase() !== "null" &&
    normalizedImage.toLowerCase() !== "undefined";
  const formattedDate = event.dateEvent
    ? new Date(event.dateEvent).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      })
    : null;
  const name = event.nomEvent || "Événement";
  const location = [event.villeDepart, event.paysDepart].filter(Boolean).join(", ") || "Lieu à confirmer";

  return (
    <div className="pointer-events-auto relative overflow-hidden rounded-[22px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,251,246,0.92),rgba(248,240,230,0.82))] shadow-[var(--shadow-md)]">
      <Link
        href={eventHref}
        className="group block"
      >
        <div className="relative h-[158px] w-full overflow-hidden">
          {!hasImage ? (
            <div
              className="flex h-full items-end justify-start p-4"
              style={{
                backgroundImage: `radial-gradient(circle at top left, ${typeColor}55, transparent 35%), linear-gradient(140deg, ${typeColor}, ${typeColor}bb)`,
              }}
            >
              <div className="max-w-[11ch] font-serif text-[22px] font-bold leading-[1.04] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.24)]">
                {name}
              </div>
            </div>
          ) : null}
          {hasImage ? (
            <>
              <Image
                src={normalizedImage}
                alt={name}
                fill
                className="object-cover transition-all duration-500 group-hover:scale-105"
                sizes="(max-width: 767px) 100vw, 420px"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,14,10,0.04),rgba(20,14,10,0.34))]" />
            </>
          ) : null}

          {event.type_event && (
            <div className="absolute bottom-3 right-3 z-10">
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm"
                style={{ backgroundColor: `${typeColor}de` }}
              >
                {event.type_event}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between p-3">
          <h3 className="line-clamp-2 pr-14 font-serif text-[18px] leading-[1.12] text-foreground">
            {name}
          </h3>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-foreground/55">
            <span>{formattedDate || "À venir"}</span>
            <span className="text-coral/55">·</span>
            <span className="truncate">{location}</span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer l'aperçu"
        className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-foreground/75 backdrop-blur-sm transition-colors hover:bg-white"
      >
        <X className="h-6 w-6" />
      </button>
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
