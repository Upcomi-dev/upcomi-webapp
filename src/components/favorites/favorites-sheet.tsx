"use client";

import { useFavorites } from "./favorites-context";
import { FavoritesPanelBody } from "./favorites-panel-body";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface FavoritesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FavoritesSheet({
  open,
  onOpenChange,
}: FavoritesSheetProps) {
  const { count } = useFavorites();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="md:hidden"
        className="top-auto right-0 bottom-0 left-0 z-[60] grid w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-[28px] rounded-b-none border-x-0 border-b-0 border-t border-white/60 bg-[linear-gradient(180deg,rgba(255,251,246,0.98),rgba(246,236,223,0.96))] p-0 shadow-[0_-18px_50px_rgba(36,23,15,0.18)] md:hidden"
      >
        <DialogTitle className="sr-only">Mes favoris</DialogTitle>

        <div className="flex justify-center px-4 pb-2 pt-3">
          <div className="h-1.5 w-10 rounded-full bg-foreground/18" />
        </div>

        <div
          className="flex max-h-[min(78dvh,42rem)] min-h-[18rem] flex-col"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between px-5 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
                Mon compte
              </p>
              <h2 className="mt-1 font-serif text-[28px] leading-none text-foreground">
                Mes favoris
              </h2>
            </div>
            {count > 0 && (
              <span className="rounded-full bg-coral/10 px-3 py-1 text-[12px] font-semibold text-coral">
                {count}
              </span>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />

          <FavoritesPanelBody
            onNavigate={() => onOpenChange(false)}
            className="flex-1 overflow-y-auto overscroll-contain pb-4"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
