"use client";

import { useCallback, useState } from "react";
import { FavoriteEventModal } from "./favorite-event-modal";
import { FavoritesPanelBody } from "./favorites-panel-body";
import type { FavoriteEvent } from "./favorites-context";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface FavoritesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FavoritesSheet({
  open,
  onOpenChange,
}: FavoritesSheetProps) {
  const [selectedEvent, setSelectedEvent] = useState<FavoriteEvent | null>(null);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSelectedEvent(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="top-auto right-0 bottom-0 left-0 z-[60] flex h-[min(82dvh,46rem)] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-[32px] rounded-b-none border-x-0 border-b-0 border-t border-white/60 bg-[linear-gradient(180deg,rgba(255,251,246,0.98),rgba(246,236,223,0.96))] p-0 shadow-[0_-18px_50px_rgba(36,23,15,0.16)] md:top-1/2 md:left-1/2 md:right-auto md:bottom-auto md:h-[min(720px,calc(100dvh-3rem))] md:w-[min(560px,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[32px] md:border md:shadow-[0_24px_80px_rgba(36,23,15,0.16)]"
        >
          <DialogTitle className="sr-only">Mes favoris et participations</DialogTitle>

          <div className="flex justify-center px-4 pb-2 pt-3 md:hidden">
            <div className="h-1.5 w-10 rounded-full bg-foreground/18" />
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <FavoritesPanelBody
              onNavigate={() => onOpenChange(false)}
              onEventOpen={setSelectedEvent}
              className="pb-4 md:pt-4"
            />
          </div>
        </DialogContent>
      </Dialog>

      {selectedEvent ? (
        <FavoriteEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      ) : null}
    </>
  );
}
