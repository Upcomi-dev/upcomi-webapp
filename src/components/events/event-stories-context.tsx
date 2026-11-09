"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth/auth-context";
import type { RecommendableEvent } from "@/components/auth/recommended-events-picker";
import { fetchOwnStoryEventIds } from "@/lib/events/stories";
import { createClient } from "@/lib/supabase/client";

/**
 * L'évènement dont on raconte l'expérience. `RecommendableEvent` (id, nom,
 * image) est déjà la forme minimale utilisée par le formulaire de récit du
 * parcours d'inscription ; le slug s'y ajoute pour le lien « Voir la page de
 * l'évènement » de l'écran de fin.
 */
export type StoryEvent = RecommendableEvent & { slug?: string | null };

interface EventStoriesContextValue {
  /** Les évènements sur lesquels l'utilisatrice a déjà déposé un récit. */
  ownStoryEventIds: Set<number>;
  hasOwnStory: (eventId: number) => boolean;
  /** `true` une fois la première lecture faite (ou l'absence de session actée). */
  ready: boolean;
  openStoryModal: (event: StoryEvent) => void;
  closeStoryModal: () => void;
  /** Appelé par la modale une fois le récit écrit. */
  markOwnStory: (eventId: number) => void;
  activeEvent: StoryEvent | null;
}

const EventStoriesContext = createContext<EventStoriesContextValue | null>(null);

export function EventStoriesProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const userId = user?.id ?? null;
  const [ownStoryEventIds, setOwnStoryEventIds] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [activeEvent, setActiveEvent] = useState<StoryEvent | null>(null);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    (async () => {
      if (!userId) {
        setOwnStoryEventIds(new Set());
        setLoaded(true);
        return;
      }

      const ids = await fetchOwnStoryEventIds(createClient(), userId);
      if (cancelled) return;

      setOwnStoryEventIds(ids);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, userId]);

  const hasOwnStory = useCallback(
    (eventId: number) => ownStoryEventIds.has(eventId),
    [ownStoryEventIds]
  );

  const markOwnStory = useCallback((eventId: number) => {
    setOwnStoryEventIds((previous) => new Set(previous).add(eventId));
  }, []);

  const openStoryModal = useCallback((event: StoryEvent) => {
    setActiveEvent(event);
  }, []);

  const closeStoryModal = useCallback(() => {
    setActiveEvent(null);
  }, []);

  const value = useMemo(
    () => ({
      ownStoryEventIds,
      hasOwnStory,
      ready: authReady && loaded,
      openStoryModal,
      closeStoryModal,
      markOwnStory,
      activeEvent,
    }),
    [
      ownStoryEventIds,
      hasOwnStory,
      authReady,
      loaded,
      openStoryModal,
      closeStoryModal,
      markOwnStory,
      activeEvent,
    ]
  );

  return (
    <EventStoriesContext.Provider value={value}>{children}</EventStoriesContext.Provider>
  );
}

export function useEventStories() {
  const context = useContext(EventStoriesContext);
  if (!context) {
    throw new Error("useEventStories must be used within an EventStoriesProvider");
  }
  return context;
}
