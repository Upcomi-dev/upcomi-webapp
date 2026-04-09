"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-context";

export interface FavoriteEvent {
  id: number;
  nomEvent: string | null;
  dateEvent: string | null;
  image: string | null;
  type_event: string | null;
  villeDepart: string | null;
}

interface FavoritesContextValue {
  favoriteIds: Set<number>;
  /** Full event data for favorites (for dropdown display). */
  favoriteEvents: FavoriteEvent[];
  count: number;
  isFavorite: (eventId: number) => boolean;
  toggleFavorite: (eventId: number) => Promise<boolean>;
  /** `true` once both auth and favorites have finished their first load. */
  ready: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const userId = user?.id ?? null;
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [favoriteEvents, setFavoriteEvents] = useState<FavoriteEvent[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  const loadFavorites = useCallback(async (uid: string) => {
    const supabase = createClient();
    const { data: favRows } = await supabase
      .from("favourite_events")
      .select("event")
      .eq("user_id", uid);

    if (!favRows?.length) {
      setFavoriteIds(new Set());
      setFavoriteEvents([]);
      return;
    }

    const ids = favRows.map((r: { event: number }) => r.event);
    setFavoriteIds(new Set(ids));

    const { data: events } = await supabase
      .from("events")
      .select("id, nomEvent, dateEvent, image, type_event, villeDepart")
      .in("id", ids);

    if (events) {
      setFavoriteEvents(events as FavoriteEvent[]);
    }
  }, []);

  // Reload favorites whenever the authenticated user changes.
  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    (async () => {
      if (!userId) {
        setFavoriteIds(new Set());
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
        setFavoriteEvents((prev) => prev.filter((e) => e.id !== eventId));
        await supabase
          .from("favourite_events")
          .delete()
          .eq("user_id", userId)
          .eq("event", eventId);
      } else {
        await supabase
          .from("favourite_events")
          .insert({ user_id: userId, event: eventId });
        // Fetch event details for the new favorite
        const { data } = await supabase
          .from("events")
          .select("id, nomEvent, dateEvent, image, type_event, villeDepart")
          .eq("id", eventId)
          .single();
        if (data) {
          setFavoriteEvents((prev) => [...prev, data as FavoriteEvent]);
        }
      }

      return !wasFavorite;
    },
    [userId, favoriteIds]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favoriteEvents,
        count: favoriteIds.size,
        isFavorite,
        toggleFavorite,
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
