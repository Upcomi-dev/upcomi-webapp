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
      // Trigger flying heart animation only when adding
      if (!favorited) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        flyingHeart?.triggerHeart(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      await toggleFavorite(eventId);
    },
    [eventId, toggleFavorite, openAuthModal, ready, user, favorited, flyingHeart]
  );

  return (
    <div className="glass rounded-[var(--radius)] p-5 text-center">
      {displayCount > 0 && (
        <p className="mb-3 text-sm font-semibold text-foreground/70">
          {displayCount} intéressé·e{displayCount > 1 ? "s" : ""}
        </p>
      )}
      <button
        onClick={handleClick}
        className={`flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-sm)] py-3.5 text-[15px] font-semibold transition-all ${
          favorited
            ? "bg-violet/20 text-violet border border-violet/30"
            : "bg-violet text-white shadow-[0_4px_20px_rgba(126,105,200,0.35)] hover:shadow-[0_6px_24px_rgba(126,105,200,0.45)]"
        }`}
      >
        <svg
          width="18"
          height="18"
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
