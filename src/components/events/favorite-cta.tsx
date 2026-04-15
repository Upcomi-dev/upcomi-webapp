"use client";

import { useCallback, useRef } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { useFlyingHeart } from "@/components/favorites/flying-heart";

interface FavoriteCTAProps {
  eventId: number;
  initialCount: number;
}

export function FavoriteCTA({ eventId, initialCount }: FavoriteCTAProps) {
  const { isFavorite, toggleFavorite, ready } = useFavorites();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const flyingHeart = useFlyingHeart();
  const favorited = isFavorite(eventId);

  // Capture whether the user had already favorited at first ready render,
  // so we know if initialCount already includes them.
  const wasInitiallyFavorited = useRef<boolean | null>(null);
  if (ready && wasInitiallyFavorited.current === null) {
    wasInitiallyFavorited.current = favorited;
  }

  // Adjust count optimistically based on client-side toggle
  const alreadyCounted = wasInitiallyFavorited.current === true;
  let displayCount = initialCount;
  if (favorited && !alreadyCounted) displayCount = initialCount + 1;
  if (!favorited && alreadyCounted) displayCount = initialCount - 1;

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!ready) return;
      if (!user) {
        openAuthModal({ view: "login" });
        return;
      }
      if (!favorited && flyingHeart) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        flyingHeart.triggerHeart(rect.left + rect.width / 2, rect.top + rect.height / 2);
        // Delay toggle so counter increments when the heart arrives
        await new Promise((r) => setTimeout(r, 950));
      }
      await toggleFavorite(eventId);
    },
    [eventId, toggleFavorite, openAuthModal, ready, user, favorited, flyingHeart]
  );

  return (
    <div className="flex items-center gap-2.5">
      {displayCount > 0 && (
        <p className="flex items-center gap-1.5 text-[12px] text-foreground/45">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {displayCount} personne{displayCount > 1 ? "s" : ""} intéressée{displayCount > 1 ? "s" : ""}
        </p>
      )}
      <button
        onClick={handleClick}
        className="ml-auto flex items-center gap-1.5 rounded-full border border-foreground/12 px-3 py-1.5 text-[12px] font-medium text-foreground/55 transition-all hover:border-[#d4caff] hover:bg-[#d4caff]/10 hover:text-foreground/80"
        style={favorited ? { backgroundColor: "#d4caff", borderColor: "#d4caff", color: "#5b4a9e" } : undefined}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill={favorited ? "currentColor" : "none"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="currentColor"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {favorited ? "Ajouté aux favoris" : "Ajouter aux favoris"}
      </button>
    </div>
  );
}
