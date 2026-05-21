"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-context";
import { getSortedFavoriteEvents, getVisibleFavoriteEvents, isVisibleFavoriteEvent } from "@/lib/utils/favorites";

export interface FavoriteEvent {
  id: number;
  nomEvent: string | null;
  dateEvent: string | null;
  dateFin: string | null;
  image: string | null;
  type_event: string | null;
  villeDepart: string | null;
  participates: boolean;
}

interface FavoritesContextValue {
  favoriteIds: Set<number>;
  participationIds: Set<number>;
  /** Full event data for favorites, including completed events. */
  allFavoriteEvents: FavoriteEvent[];
  /** Full event data for favorites (for dropdown display). */
  favoriteEvents: FavoriteEvent[];
  /** Full event data for participations, including completed events. */
  allParticipationEvents: FavoriteEvent[];
  /** Full event data for upcoming participations. */
  participationEvents: FavoriteEvent[];
  count: number;
  participationCount: number;
  isFavorite: (eventId: number) => boolean;
  isParticipating: (eventId: number) => boolean;
  toggleFavorite: (eventId: number) => Promise<boolean>;
  toggleParticipation: (eventId: number) => Promise<boolean>;
  /** `true` once both auth and favorites have finished their first load. */
  ready: boolean;
}

type FavouriteRow = {
  event: number;
  participates: boolean | null;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const userId = user?.id ?? null;
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [participationIds, setParticipationIds] = useState<Set<number>>(new Set());
  const [allFavoriteEvents, setAllFavoriteEvents] = useState<FavoriteEvent[]>([]);
  const [favoriteEvents, setFavoriteEvents] = useState<FavoriteEvent[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  const loadFavorites = useCallback(async (uid: string) => {
    const supabase = createClient();
    const { data: favRows } = await supabase
      .from("favourite_events")
      .select("event, participates")
      .eq("user_id", uid);

    if (!favRows?.length) {
      setFavoriteIds(new Set());
      setParticipationIds(new Set());
      setAllFavoriteEvents([]);
      setFavoriteEvents([]);
      return;
    }

    const rows = favRows as FavouriteRow[];
    const ids = rows.map((r) => r.event);
    const nextParticipationIds = new Set(
      rows.filter((r) => r.participates === true).map((r) => r.event)
    );
    setFavoriteIds(new Set(ids));
    setParticipationIds(nextParticipationIds);

    const { data: events } = await supabase
      .from("events")
      .select("id, nomEvent, dateEvent, dateFin, image, type_event, villeDepart")
      .in("id", ids);

    if (events) {
      const favoriteRows = (events as Omit<FavoriteEvent, "participates">[]).map((event) => ({
        ...event,
        participates: nextParticipationIds.has(event.id),
      }));
      setAllFavoriteEvents(getSortedFavoriteEvents(favoriteRows));
      setFavoriteEvents(getVisibleFavoriteEvents(favoriteRows));
    }
  }, []);

  // Reload favorites whenever the authenticated user changes.
  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    (async () => {
      if (!userId) {
        setFavoriteIds(new Set());
        setParticipationIds(new Set());
        setAllFavoriteEvents([]);
        setFavoriteEvents([]);
        setFavoritesLoaded(true);
        return;
      }

      await loadFavorites(userId);
      if (!cancelled) setFavoritesLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, userId, loadFavorites]);

  const isFavorite = useCallback(
    (eventId: number) => favoriteIds.has(eventId),
    [favoriteIds]
  );

  const isParticipating = useCallback(
    (eventId: number) => participationIds.has(eventId),
    [participationIds]
  );

  const allParticipationEvents = useMemo(
    () => allFavoriteEvents.filter((event) => event.participates),
    [allFavoriteEvents]
  );
  const participationEvents = useMemo(
    () => favoriteEvents.filter((event) => event.participates),
    [favoriteEvents]
  );
  const participationCount = useMemo(
    () => participationEvents.length,
    [participationEvents]
  );

  const toggleFavorite = useCallback(
    async (eventId: number): Promise<boolean> => {
      if (!userId) return false;

      const supabase = createClient();
      const wasFavorite = favoriteIds.has(eventId);

      // Optimistic update for IDs
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) {
          next.delete(eventId);
        } else {
          next.add(eventId);
        }
        return next;
      });

      if (wasFavorite) {
        setParticipationIds((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
        setAllFavoriteEvents((prev) => prev.filter((e) => e.id !== eventId));
        setFavoriteEvents((prev) => prev.filter((e) => e.id !== eventId));
        await supabase
          .from("favourite_events")
          .delete()
          .eq("user_id", userId)
          .eq("event", eventId);
      } else {
        await supabase
          .from("favourite_events")
          .insert({ user_id: userId, event: eventId, participates: false });
        // Fetch event details for the new favorite
        const { data } = await supabase
          .from("events")
          .select("id, nomEvent, dateEvent, dateFin, image, type_event, villeDepart")
          .eq("id", eventId)
          .single();
        if (data) {
          const nextEvent = { ...(data as Omit<FavoriteEvent, "participates">), participates: false };
          setAllFavoriteEvents((prev) =>
            getSortedFavoriteEvents([...prev, nextEvent])
          );
        }
        if (data) {
          const nextEvent = { ...(data as Omit<FavoriteEvent, "participates">), participates: false };
          if (!isVisibleFavoriteEvent(nextEvent)) return !wasFavorite;
          setFavoriteEvents((prev) =>
            getVisibleFavoriteEvents([...prev, nextEvent])
          );
        }
      }

      return !wasFavorite;
    },
    [userId, favoriteIds]
  );

  const toggleParticipation = useCallback(
    async (eventId: number): Promise<boolean> => {
      if (!userId || !favoriteIds.has(eventId)) return false;

      const supabase = createClient();
      const wasParticipating = participationIds.has(eventId);
      const participates = !wasParticipating;

      setParticipationIds((prev) => {
        const next = new Set(prev);
        if (participates) {
          next.add(eventId);
        } else {
          next.delete(eventId);
        }
        return next;
      });

      const markEvent = (event: FavoriteEvent) =>
        event.id === eventId ? { ...event, participates } : event;

      setAllFavoriteEvents((prev) => prev.map(markEvent));
      setFavoriteEvents((prev) => prev.map(markEvent));

      const { error } = await supabase
        .from("favourite_events")
        .update({ participates })
        .eq("user_id", userId)
        .eq("event", eventId);

      if (error) {
        setParticipationIds((prev) => {
          const next = new Set(prev);
          if (wasParticipating) {
            next.add(eventId);
          } else {
            next.delete(eventId);
          }
          return next;
        });
        setAllFavoriteEvents((prev) =>
          prev.map((event) =>
            event.id === eventId ? { ...event, participates: wasParticipating } : event
          )
        );
        setFavoriteEvents((prev) =>
          prev.map((event) =>
            event.id === eventId ? { ...event, participates: wasParticipating } : event
          )
        );
        return wasParticipating;
      }

      return participates;
    },
    [favoriteIds, participationIds, userId]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        participationIds,
        allFavoriteEvents,
        favoriteEvents,
        allParticipationEvents,
        participationEvents,
        count: favoriteEvents.length,
        participationCount,
        isFavorite,
        isParticipating,
        toggleFavorite,
        toggleParticipation,
        ready: authReady && favoritesLoaded,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
