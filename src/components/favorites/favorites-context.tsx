"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

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
  ready: boolean;
  isAuthenticated: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [favoriteEvents, setFavoriteEvents] = useState<FavoriteEvent[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const userIdRef = useRef<string | null>(null);

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

  // Load user + their favorites on mount
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setReady(true);
        return;
      }
      userIdRef.current = user.id;
      setUserId(user.id);
      await loadFavorites(user.id);
      setReady(true);
    })();

    // Listen for auth changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: { user: { id: string } } | null) => {
      if (event === "INITIAL_SESSION") return;
      if (event === "TOKEN_REFRESHED") return;

      if (session?.user) {
        if (session.user.id !== userIdRef.current) {
          userIdRef.current = session.user.id;
          setUserId(session.user.id);
          await loadFavorites(session.user.id);
        }
      } else if (event === "SIGNED_OUT") {
        userIdRef.current = null;
        setUserId(null);
        setFavoriteIds(new Set());
        setFavoriteEvents([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadFavorites]);

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
        ready,
        isAuthenticated: userId !== null,
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
