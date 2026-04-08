"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import type { CollectionWithEvents } from "@/lib/types/database";
import { EventCard } from "@/components/events/event-card";

interface CollectionCarouselProps {
  collection: CollectionWithEvents;
  onEventClick: (eventId: number) => void;
  onEventHover?: (eventId: number | null) => void;
}

export function CollectionCarousel({ collection, onEventClick, onEventHover }: CollectionCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 280;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  if (collection.events.length < 3) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-[20px] leading-tight text-foreground">
            {collection.name}
          </h2>
          {collection.description && (
            <p className="mt-0.5 text-[12px] text-foreground/50">
              {collection.description}
            </p>
          )}
        </div>

        {/* Arrows — always visible (tablet has no hover) */}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-white/70 text-foreground/50 transition-all hover:bg-white hover:text-foreground disabled:opacity-30 disabled:cursor-default"
            aria-label="Précédent"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-white/70 text-foreground/50 transition-all hover:bg-white hover:text-foreground disabled:opacity-30 disabled:cursor-default"
            aria-label="Suivant"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-hide -mr-4 flex gap-3 overflow-x-auto snap-x snap-mandatory md:-mr-5"
      >
        {collection.events.map((event) => (
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
            variant="carousel"
            onEventClick={onEventClick}
            onEventHover={onEventHover}
          />
        ))}
      </div>
    </section>
  );
}

export function CollectionCarouselSkeleton() {
  return (
    <section className="space-y-3">
      <div className="h-6 w-40 animate-pulse rounded-lg bg-foreground/8" />
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 md:-mx-5 md:px-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[280px] w-[260px] flex-none animate-pulse rounded-[22px] bg-foreground/6"
          />
        ))}
      </div>
    </section>
  );
}
