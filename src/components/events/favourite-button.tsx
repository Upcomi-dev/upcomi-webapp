"use client";

import { useCallback } from "react";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";

interface FavouriteButtonProps {
  eventId: number;
}

export function FavouriteButton({ eventId }: FavouriteButtonProps) {
  const { isFavorite, toggleFavorite, ready, isAuthenticated } = useFavorites();
  const { openAuthModal } = useAuthModal();
  const favorited = isFavorite(eventId);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!ready) return;

      if (!isAuthenticated) {
        openAuthModal({ view: "login" });
        return;
      }

      await toggleFavorite(eventId);
    },
    [eventId, toggleFavorite, openAuthModal, ready, isAuthenticated]
  );

  return (
    <button
      onClick={handleClick}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
        favorited
          ? "border-coral/40 bg-coral/10 text-coral"
          : "border-white/45 bg-white/58 text-foreground/35 hover:border-coral/40 hover:text-coral"
      }`}
      aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={favorited ? "currentColor" : "none"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
