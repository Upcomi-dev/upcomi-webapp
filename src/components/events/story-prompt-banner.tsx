"use client";

import { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useFavorites, type FavoriteEvent } from "@/components/favorites/favorites-context";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getEventEndDateKey, isEventPast } from "@/lib/utils/event-dates";
import { useEventStories } from "./event-stories-context";

/**
 * Le bandeau orange de relance du prototype (`ui.js`, `pickBannerCandidate`),
 * réduit à sa variante « récit » : un évènement auquel on a participé est
 * passé, on n'en a rien raconté. L'autre variante du prototype (« finalement,
 * tu t'es inscrit·e ? ») relève du cycle d'inscription, pas de cette brique.
 *
 * Un seul évènement à la fois, le plus récemment terminé — une pile de
 * relances se ferait fermer en bloc.
 */
const DISMISSED_STORAGE_PREFIX = "upcomi:story-prompt-dismissed:";

function readDismissed(userId: string): Set<number> {
  if (typeof window === "undefined") return new Set();

  try {
    const raw = window.localStorage.getItem(`${DISMISSED_STORAGE_PREFIX}${userId}`);
    if (!raw) return new Set();

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(parsed.filter((value): value is number => typeof value === "number"));
  } catch {
    // Stockage indisponible (navigation privée, quota) : on relance, quitte à
    // réafficher un bandeau déjà fermé. C'est moins grave que de planter.
    return new Set();
  }
}

function writeDismissed(userId: string, eventIds: Set<number>) {
  try {
    window.localStorage.setItem(
      `${DISMISSED_STORAGE_PREFIX}${userId}`,
      JSON.stringify([...eventIds])
    );
  } catch {
    // Voir readDismissed : l'oubli est acceptable, l'erreur ne l'est pas.
  }
}

export function StoryPromptBanner() {
  const { user } = useAuth();
  const { allParticipationEvents, ready: favoritesReady } = useFavorites();
  const { hasOwnStory, openStoryModal, ready: storiesReady } = useEventStories();
  const userId = user?.id ?? null;
  // Les bandeaux déjà fermés sont relus pendant le rendu, pas dans un effet :
  // passer par un effet afficherait le bandeau le temps d'un rendu avant de le
  // retirer, soit exactement le clignotement qu'on veut éviter.
  const [dismissed, setDismissed] = useState<Set<number>>(() => new Set());
  const [dismissedUserId, setDismissedUserId] = useState<string | null>(null);

  if (userId !== dismissedUserId) {
    setDismissedUserId(userId);
    setDismissed(userId ? readDismissed(userId) : new Set());
  }

  const candidate = useMemo(() => {
    if (!userId || !favoritesReady || !storiesReady) return null;

    return (
      allParticipationEvents
        .filter(
          (event) =>
            isEventPast(event) && !hasOwnStory(event.id) && !dismissed.has(event.id)
        )
        .sort((a, b) => (getEventEndDateKey(b) ?? "").localeCompare(getEventEndDateKey(a) ?? ""))
        .at(0) ?? null
    );
  }, [allParticipationEvents, dismissed, favoritesReady, hasOwnStory, storiesReady, userId]);

  const handleDismiss = useCallback(
    (event: FavoriteEvent) => {
      if (!userId) return;

      setDismissed((previous) => {
        const next = new Set(previous).add(event.id);
        writeDismissed(userId, next);
        return next;
      });

      trackAnalyticsEvent("Event Story Prompt Dismissed", { event_id: event.id });
    },
    [userId]
  );

  if (!candidate) return null;

  return (
    <div className="relative flex w-full bg-orange px-4 py-3 pr-12 text-white md:px-6 md:pr-14">
      <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2.5 text-center">
        <p className="text-sm font-medium">
          <strong className="font-bold">{candidate.nomEvent || "Ton évènement"}</strong>{" "}
          est passé. Peux-tu partager ton expérience avec la communauté&nbsp;?
        </p>
        <button
          type="button"
          onClick={() =>
            openStoryModal({
              id: candidate.id,
              nomEvent: candidate.nomEvent,
              image: candidate.image,
              slug: candidate.slug,
            })
          }
          className="inline-flex min-h-[30px] items-center rounded-full bg-white px-4 text-[13px] font-semibold text-orange-dark transition-colors hover:bg-white/90"
        >
          Partager mon expérience
        </button>
      </div>

      <button
        type="button"
        onClick={() => handleDismiss(candidate)}
        aria-label="Fermer"
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white md:top-1/2 md:-translate-y-1/2"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
