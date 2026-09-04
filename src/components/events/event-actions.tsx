"use client";

import { useCallback } from "react";
import { ArrowRight, Heart } from "lucide-react";
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
  orientation = "row",
  source,
  className,
}: EventActionsProps) {
  const { isFavorite, toggleFavorite, ready } = useFavorites();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const flyingHeart = useFlyingHeart();
  const favorited = isFavorite(eventId);

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

  // En rangée, les deux boutons se partagent la largeur ; en colonne, chacun
  // la prend entière — `flex-1` y porterait sur la hauteur et les aplatirait.
  const widthClassName = orientation === "column" ? "w-full" : "flex-1";

  return (
    <div className={cn("flex gap-2.5", orientation === "column" && "flex-col", className)}>
        {registrationUrl && (
          <ExternalRegistrationLink
            href={registrationUrl}
            eventId={eventId}
            eventType={eventType}
            organizer={organizer}
            className={cn("btn-secondary px-4", widthClassName)}
          >
            M&apos;inscrire
            {/* Une flèche, pas l'icône de lien externe : on sait déjà que
                l'inscription part sur le site de l'organisation, et le
                pictogramme la faisait lire comme une note de bas de page
                plutôt que comme l'action principale. */}
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </ExternalRegistrationLink>
        )}
        <button
          type="button"
          onClick={handleInterest}
          className={cn("btn-primary px-4", widthClassName)}
          data-active={favorited}
        >
          <Heart className="h-4 w-4" strokeWidth={1.8} fill={favorited ? "currentColor" : "none"} />
          {favorited ? "Intéressé·e" : "Ça m'intéresse"}
        </button>
    </div>
  );
}
