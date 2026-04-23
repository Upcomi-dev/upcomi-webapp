"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { MapEvent, CollectionWithEvents } from "@/lib/types/database";
import { CollectionsView } from "@/components/collections/collections-view";
import { EventCard } from "@/components/events/event-card";
import { EventDetailPanel } from "@/components/events/event-detail-panel";
import { SortControl } from "@/components/events/sort-control";
import { InlineFilters } from "@/components/events/event-filters";

type SnapLevel = "peek" | "half" | "full";

interface MobileBottomSheetProps {
  collections: CollectionWithEvents[];
  events: MapEvent[];
  listEvents: MapEvent[];
  hasFilters: boolean;
  panelMode: string;
  selectedEventId: number | null;
  detailEventId: number | null;
  /** Increments on every map background click — collapses the sheet to peek. */
  collapseSignal?: number;
  onEventClick: (eventId: number) => void;
  onBackFromDetail: () => void;
}

const PEEK_HEIGHT = 148;
const BOTTOM_NAV_HEIGHT = 0;

export function MobileBottomSheet({
  collections,
  events,
  listEvents,
  hasFilters,
  detailEventId,
  collapseSignal,
  onEventClick,
  onBackFromDetail,
}: MobileBottomSheetProps) {
  const [snap, setSnap] = useState<SnapLevel>("peek");
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const startY = useRef(0);
  const startTranslate = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const getSnapTranslate = useCallback((level: SnapLevel) => {
    // Sheet height = 100dvh - 60px - BOTTOM_NAV_HEIGHT
    // translateY moves the sheet down from its natural position (bottom: BOTTOM_NAV_HEIGHT)
    // At translateY=0, the sheet is fully visible
    // At translateY=sheetHeight - PEEK_HEIGHT, only peek is visible
    const sheetHeight = window.innerHeight - 60 - BOTTOM_NAV_HEIGHT;
    switch (level) {
      case "peek": return sheetHeight - PEEK_HEIGHT;
      case "half": return sheetHeight * 0.5;
      // "full" opens to 90% of the sheet height (keeps a 10% peek of the map above).
      case "full": return sheetHeight * 0.1;
    }
  }, []);

  // Set initial position after mount
  useEffect(() => {
    if (mounted) {
      setTranslateY(getSnapTranslate("peek"));
    }
  }, [mounted, getSnapTranslate]);

  // Open to half when detail is selected
  useEffect(() => {
    if (detailEventId != null) {
      setSnap("full");
      setTranslateY(getSnapTranslate("full"));
    }
  }, [detailEventId, getSnapTranslate]);

  // Collapse to peek when the map background is clicked.
  // Skip the initial mount by ignoring undefined signals.
  useEffect(() => {
    if (collapseSignal === undefined) return;
    setSnap("peek");
    setTranslateY(getSnapTranslate("peek"));
  }, [collapseSignal, getSnapTranslate]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setDragging(true);
    startY.current = e.touches[0].clientY;
    startTranslate.current = translateY;
  }, [translateY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const deltaY = e.touches[0].clientY - startY.current;
    const newTranslate = Math.max(60, startTranslate.current + deltaY);
    setTranslateY(newTranslate);
  }, [dragging]);

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    const vh = window.innerHeight;
    const peekT = getSnapTranslate("peek");
    const halfT = getSnapTranslate("half");
    const fullT = getSnapTranslate("full");

    // Snap to nearest
    const distances = [
      { level: "peek" as SnapLevel, dist: Math.abs(translateY - peekT) },
      { level: "half" as SnapLevel, dist: Math.abs(translateY - halfT) },
      { level: "full" as SnapLevel, dist: Math.abs(translateY - fullT) },
    ];
    distances.sort((a, b) => a.dist - b.dist);
    const nearest = distances[0].level;

    // Also check velocity: if dragged down past peek, stay at peek
    if (translateY > vh - 80) {
      setSnap("peek");
      setTranslateY(peekT);
    } else {
      setSnap(nearest);
      setTranslateY(getSnapTranslate(nearest));
    }
  }, [translateY, getSnapTranslate]);

  const handleHeaderClick = useCallback(() => {
    if (snap === "peek") {
      setSnap("full");
      setTranslateY(getSnapTranslate("full"));
    } else {
      setSnap("peek");
      setTranslateY(getSnapTranslate("peek"));
    }
  }, [snap, getSnapTranslate]);

  const detailEvent = detailEventId != null
    ? events.find((e) => e.id === detailEventId)
    : null;

  if (!mounted) return null;

  return (
    <div
      ref={sheetRef}
      className="fixed inset-x-0 z-40 flex flex-col rounded-t-[24px] border-t border-white/50 bg-[var(--background)] shadow-[0_-4px_30px_rgba(0,0,0,0.1)] md:hidden"
      data-bottom-sheet
      style={{
        bottom: `${BOTTOM_NAV_HEIGHT}px`,
        height: `calc(100dvh - 60px - ${BOTTOM_NAV_HEIGHT}px)`,
        transform: `translateY(${translateY}px)`,
        transition: dragging ? "none" : "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Handle */}
      <div
        className="flex flex-col items-center gap-2 pb-2 pt-3"
        style={{ touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleHeaderClick}
      >
        <div className="h-1.5 w-10 rounded-full bg-foreground/20" />
      </div>

      {/* Peek header */}
      <div
        className="px-4 pb-3"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleHeaderClick}
        style={{ touchAction: "none" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-[20px] text-foreground">
            {detailEvent ? (detailEvent.nomEvent || "Événement") : "Explorer"}
          </h2>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/42">
            {listEvents.length} événements
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-6"
        style={{ overscrollBehavior: "contain" }}
      >
        {detailEvent ? (
          <EventDetailPanel
            key={detailEvent.id}
            event={detailEvent}
            onBack={onBackFromDetail}
            onEventSelect={onEventClick}
          />
        ) : hasFilters ? (
          <div className="space-y-4">
            <div className="rounded-[20px] border border-white/48 bg-white/34 p-3">
              <InlineFilters />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-[18px] text-foreground">Résultats</h3>
              <SortControl />
            </div>
            {listEvents.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-foreground/12 bg-white/36 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-foreground">Aucun événement</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    nomEvent={event.nomEvent}
                    dateEvent={event.dateEvent}
                    image={event.image}
                    bike_type={event.bike_type}
                    type_event={event.type_event}
                    villeDepart={event.villeDepart}
                    paysDepart={event.paysDepart}
                    variant="list"
                    onEventClick={onEventClick}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[20px] border border-white/48 bg-white/34 p-3">
              <InlineFilters />
            </div>
            {collections.length > 0 ? (
              <CollectionsView
                collections={collections}
                onEventClick={onEventClick}
              />
            ) : (
              <div className="space-y-3">
                {listEvents.slice(0, 10).map((event) => (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    nomEvent={event.nomEvent}
                    dateEvent={event.dateEvent}
                    image={event.image}
                    bike_type={event.bike_type}
                    type_event={event.type_event}
                    villeDepart={event.villeDepart}
                    paysDepart={event.paysDepart}
                    variant="list"
                    onEventClick={onEventClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
