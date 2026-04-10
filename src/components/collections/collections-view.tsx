"use client";

import type { CollectionWithEvents } from "@/lib/types/database";
import { CollectionCarousel } from "./collection-carousel";

interface CollectionsViewProps {
  collections: CollectionWithEvents[];
  onEventClick: (eventId: number) => void;
  onEventHover?: (eventId: number | null) => void;
}

export function CollectionsView({ collections, onEventClick, onEventHover }: CollectionsViewProps) {
  const visibleCollections = collections
    .filter((c) => c.events.length > 0)
    .sort((a, b) => a.order - b.order);

  if (visibleCollections.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-foreground/12 bg-white/36 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-foreground">Aucune collection</p>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-foreground/45">
          Les collections apparaissent ici quand elles contiennent au moins 3 événements
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visibleCollections.map((collection) => (
        <CollectionCarousel
          key={collection.id}
          collection={collection}
          onEventClick={onEventClick}
          onEventHover={onEventHover}
        />
      ))}
    </div>
  );
}
