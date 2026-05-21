"use client";

import { EventDetailPanel } from "@/components/events/event-detail-panel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { MapEvent } from "@/lib/types/database";
import type { FavoriteEvent } from "./favorites-context";

interface FavoriteEventModalProps {
  event: FavoriteEvent;
  onClose: () => void;
}

export function FavoriteEventModal({ event, onClose }: FavoriteEventModalProps) {
  return (
    <Dialog open onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        overlayClassName="z-[70] bg-[rgba(36,23,15,0.34)] supports-backdrop-filter:backdrop-blur-md"
        className="top-0 left-0 z-[80] flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-[linear-gradient(180deg,rgba(255,251,246,0.99),rgba(246,236,223,0.98))] p-0 shadow-[0_30px_90px_rgba(36,23,15,0.22)] sm:max-w-none md:top-1/2 md:left-1/2 md:h-[min(920px,calc(100dvh-2rem))] md:w-[min(768px,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[32px] md:border md:border-white/60"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {event.nomEvent || "Détail de l'événement"}
        </DialogTitle>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-10 md:py-8"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          <EventDetailPanel event={toMapEvent(event)} onBack={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function toMapEvent(event: FavoriteEvent): MapEvent {
  return {
    id: event.id,
    nomEvent: event.nomEvent,
    latitude: 0,
    longitude: 0,
    bike_type: null,
    type_event: event.type_event,
    dateEvent: event.dateEvent,
    dateFin: event.dateFin,
    image: event.image,
    distance_range_filter: null,
    distance: null,
    region: null,
    budget: null,
    villeDepart: event.villeDepart,
    paysDepart: null,
    organisateur: null,
    mint: false,
  };
}
