"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFavorites } from "./favorites-context";
import { FavouriteButton } from "@/components/events/favourite-button";
import { getEventTypeColor } from "@/lib/types/database";

interface FavoritesDropdownProps {
  onClose: () => void;
}

export function FavoritesDropdown({ onClose }: FavoritesDropdownProps) {
  const { favoriteEvents, count, isAuthenticated } = useFavorites();
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
      <div className="max-h-[360px] overflow-y-auto">
        {!isAuthenticated ? (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-coral/10 text-coral">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-foreground">
              Connecte-toi pour voir tes favoris
            </p>
            <p className="mt-1 text-[12px] text-foreground/45">
              Sauvegarde les événements qui te plaisent
            </p>
          </div>
        ) : count === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 text-foreground/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-foreground">
              Pas encore de favoris
            </p>
            <p className="mt-1 text-[12px] text-foreground/45">
              Clique sur le coeur d&apos;un événement
            </p>
          </div>
        ) : (
          <div className="py-1.5">
            {favoriteEvents.map((event) => {
              const typeColor = getEventTypeColor(event.type_event);

              return (
                <div
                  key={event.id}
                  className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-foreground/[0.03]"
                >
                  <Link
                    href={`/?event=${event.id}`}
                    onClick={onClose}
                    className="flex flex-1 items-center gap-3 min-w-0"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-11 w-11 flex-none overflow-hidden rounded-[10px]">
                      {event.image ? (
                        <Image
                          src={event.image}
                          alt={event.nomEvent || "Event"}
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${typeColor}, ${typeColor}bb)`,
                          }}
                        >
                          <span className="text-[10px] font-bold text-white/60">
                            {event.nomEvent?.substring(0, 2).toUpperCase() || "EV"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold leading-tight text-foreground">
                        {event.nomEvent || "Événement"}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-foreground/45">
                        {event.dateEvent && (
                          <span>
                            {new Date(event.dateEvent).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                        {event.dateEvent && event.villeDepart && (
                          <span className="text-coral/40">·</span>
                        )}
                        {event.villeDepart && (
                          <span className="truncate">{event.villeDepart}</span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Remove button */}
                  <FavouriteButton eventId={event.id} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
