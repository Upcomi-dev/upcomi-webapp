"use client";

import { useEffect, useRef } from "react";
import { useFavorites } from "./favorites-context";
import { FavoritesPanelBody } from "./favorites-panel-body";

interface FavoritesDropdownProps {
  onClose: () => void;
}

export function FavoritesDropdown({ onClose }: FavoritesDropdownProps) {
  const { count } = useFavorites();
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[340px] overflow-hidden rounded-[var(--radius)] border border-white/60 bg-popover shadow-[var(--shadow-lg)] backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h3 className="font-serif text-[17px] font-bold text-foreground">
          Mes favoris
        </h3>
        {count > 0 && (
          <span className="rounded-full bg-coral/10 px-2.5 py-0.5 text-[11px] font-semibold text-coral">
            {count}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />

      {/* Content */}
      <FavoritesPanelBody
        onNavigate={onClose}
        className="max-h-[360px] overflow-y-auto"
      />
    </div>
  );
}
