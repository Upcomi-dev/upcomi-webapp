"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { FavouriteButton } from "@/components/events/favourite-button";
import { getEventTypeColor } from "@/lib/types/database";
import { buildRelativeUrl, withReturnTo } from "@/lib/utils/navigation";
import { makeEventSlug } from "@/lib/utils/slugify";
import { useFavorites } from "./favorites-context";

interface FavoritesPanelBodyProps {
  onNavigate?: () => void;
  className?: string;
}

export function FavoritesPanelBody({
  onNavigate,
  className,
}: FavoritesPanelBodyProps) {
  const { favoriteEvents, count } = useFavorites();
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAuthenticated = user !== null;
  const returnTo = buildRelativeUrl(pathname, searchParams.toString());

  return (
    <div className={className}>
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
            const eventSlug = makeEventSlug(event.id, event.nomEvent);
            const eventHref = withReturnTo(`/event/${eventSlug}`, returnTo);

            return (
              <div
                key={event.id}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-foreground/[0.03]"
              >
                <Link
                  href={eventHref}
                  onNavigate={onNavigate}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
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

                <FavouriteButton eventId={event.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
