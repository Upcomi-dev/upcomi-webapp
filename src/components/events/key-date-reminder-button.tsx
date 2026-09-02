"use client";

import { useCallback } from "react";
import { Check, Mail } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface KeyDateReminderButtonProps {
  eventId: number;
}

/**
 * « M'envoyer un rappel » à l'ouverture des inscriptions.
 *
 * Ce n'est pas un état à part : c'est un habillage du favori, comme dans le
 * prototype. Mettre l'évènement en favoris est déjà le geste qui dit « préviens
 * moi » — en ouvrir un second (table de rappels, envoi d'e-mails) est une
 * brique en soi, volontairement laissée de côté ici.
 */
export function KeyDateReminderButton({ eventId }: KeyDateReminderButtonProps) {
  const { isFavorite, toggleFavorite, ready } = useFavorites();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const favorited = isFavorite(eventId);

  const handleClick = useCallback(async () => {
    if (!ready) return;
    if (!user) {
      trackAnalyticsEvent("Favorite Toggled", {
        event_id: eventId,
        action: "auth_required",
        authenticated: false,
        source: "key_date_reminder",
      });
      openAuthModal({ view: "login" });
      return;
    }
    const isNowFavorite = await toggleFavorite(eventId);
    trackAnalyticsEvent("Favorite Toggled", {
      event_id: eventId,
      action: favorited ? "removed" : "added",
      authenticated: true,
      source: "key_date_reminder",
    });
    if (isNowFavorite) {
      trackAnalyticsEvent("Favorite Added", {
        event_id: eventId,
        source: "key_date_reminder",
      });
    }
  }, [eventId, favorited, openAuthModal, ready, toggleFavorite, user]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        favorited
          ? "border-coral/40 bg-coral/10 text-coral"
          : "border-foreground/12 bg-white/58 text-foreground/60 hover:border-coral/40 hover:text-coral"
      }`}
    >
      {favorited ? (
        <>
          <Check className="h-3 w-3" strokeWidth={2} />
          Tu seras prévenu·e
        </>
      ) : (
        <>
          <Mail className="h-3 w-3" strokeWidth={1.8} />
          M&apos;envoyer un rappel
        </>
      )}
    </button>
  );
}
