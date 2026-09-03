"use client";

import { useCallback, useRef } from "react";
import { ExternalLink, Heart } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { useFlyingHeart } from "@/components/favorites/flying-heart";
import { ExternalRegistrationLink } from "@/components/events/external-registration-link";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface EventActionsProps {
  eventId: number;
  registrationUrl: string | null;
  eventType: string | null;
  organizer: string | null;
  initialFavCount: number;
  /**
   * `row` en mobile (haut de fiche et barre collante), `column` dans la
   * colonne de droite en desktop, où la largeur ne permet pas deux boutons
   * côte à côte.
   */
  orientation?: "row" | "column";
  /** D'où vient le clic, pour la télémétrie. */
  source: string;
  className?: string;
}

const BUTTON_BASE =
  "inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors";

/**
 * Les deux actions de la fiche : s'inscrire, et dire que l'évènement
 * intéresse.
 *
 * « Ça m'intéresse » est le bouton primaire et « M'inscrire » le secondaire :
 * l'inscription part sur le site de l'organisation, elle ne peut pas être
 * l'engagement qu'on demande en premier. La même paire est répétée en haut de
 * fiche, dans la barre collante en mobile et dans la colonne de droite en
 * desktop — c'est l'action principale de la page, elle doit rester à portée
 * quel que soit l'endroit où on se trouve dans la lecture.
 */
export function EventActions({
  eventId,
  registrationUrl,
  eventType,
  organizer,
  initialFavCount,
  orientation = "row",
  source,
  className,
}: EventActionsProps) {
  const { isFavorite, toggleFavorite, ready } = useFavorites();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const flyingHeart = useFlyingHeart();
  const favorited = isFavorite(eventId);

  // Le compteur rendu côté serveur inclut déjà l'utilisatrice si elle avait
  // mis l'évènement en favori : on retient son état au premier rendu prêt
  // pour ne pas la compter deux fois en basculant.
  const wasInitiallyFavorited = useRef<boolean | null>(null);
  /* eslint-disable react-hooks/refs */
  if (ready && wasInitiallyFavorited.current === null) {
    wasInitiallyFavorited.current = favorited;
  }
  const alreadyCounted = wasInitiallyFavorited.current === true;
  /* eslint-enable react-hooks/refs */

  let displayCount = initialFavCount;
  if (favorited && !alreadyCounted) displayCount = initialFavCount + 1;
  if (!favorited && alreadyCounted) displayCount = initialFavCount - 1;

  const handleInterest = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!ready) return;

      if (!user) {
        trackAnalyticsEvent("Favorite Toggled", {
          event_id: eventId,
          action: "auth_required",
          authenticated: false,
          source,
        });
        openAuthModal({ view: "login" });
        return;
      }

      if (!favorited && flyingHeart) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        flyingHeart.triggerHeart(rect.left + rect.width / 2, rect.top + rect.height / 2);
        // Le compteur s'incrémente à l'arrivée du cœur, pas au clic.
        await new Promise((r) => setTimeout(r, 950));
      }

      const isNowFavorite = await toggleFavorite(eventId);
      trackAnalyticsEvent("Favorite Toggled", {
        event_id: eventId,
        action: favorited ? "removed" : "added",
        authenticated: true,
        source,
      });
      if (isNowFavorite) {
        trackAnalyticsEvent("Favorite Added", { event_id: eventId, source });
      }
    },
    [eventId, favorited, flyingHeart, openAuthModal, ready, source, toggleFavorite, user]
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {displayCount > 0 && (
        <p
          className={cn(
            "text-[14px] font-semibold text-foreground/60",
            orientation === "column" && "text-center"
          )}
        >
          {displayCount} personne{displayCount > 1 ? "s" : ""} intéressée
          {displayCount > 1 ? "s" : ""}
        </p>
      )}

      <div className={cn("flex gap-2.5", orientation === "column" && "flex-col")}>
        {registrationUrl && (
          <ExternalRegistrationLink
            href={registrationUrl}
            eventId={eventId}
            eventType={eventType}
            organizer={organizer}
            className={cn(
              BUTTON_BASE,
              "border border-coral/35 bg-white text-coral hover:bg-coral/6"
            )}
          >
            M&apos;inscrire
            <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
          </ExternalRegistrationLink>
        )}
        <button
          type="button"
          onClick={handleInterest}
          className={cn(
            BUTTON_BASE,
            "text-white shadow-[0_2px_12px_rgba(235,95,59,0.25)]",
            favorited ? "bg-coral-dark" : "bg-coral hover:bg-coral-dark"
          )}
        >
          <Heart className="h-4 w-4" strokeWidth={1.8} fill={favorited ? "currentColor" : "none"} />
          {favorited ? "Intéressé·e" : "Ça m'intéresse"}
        </button>
      </div>
    </div>
  );
}
