"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import {
  fetchInterestedCount,
  fetchInterestedPeople,
  type InterestedPerson,
} from "@/lib/events/interested-people";

/**
 * Les personnes intéressées par l'évènement affiché, chargées **une fois** pour
 * toute la fiche : le bloc du haut, celui de la colonne de droite, celui de la
 * barre collante et la feuille de personnes lisent tous la même liste.
 *
 * Les deux lectures ne viennent pas de la même source, et c'est volontaire : le
 * **nombre** est public (`get_event_interested_count`), les **personnes** ne le
 * sont pas (`get_event_interested_people`, réservée aux comptes connectés). Une
 * personne déconnectée voit donc combien elles sont, jamais qui elles sont.
 */

interface InterestedPeopleContextValue {
  /** Total, moi comprise. */
  count: number;
  /** Les **autres** : on ne se présente pas à soi-même dans la liste. */
  people: InterestedPerson[];
  /** `true` tant que le premier chargement n'est pas terminé. */
  loading: boolean;
}

const InterestedPeopleContext = createContext<InterestedPeopleContextValue | null>(null);

interface Snapshot {
  count: number;
  people: InterestedPerson[];
  /** Mon propre intérêt était-il déjà là au moment de la lecture ? */
  includesMe: boolean;
  loading: boolean;
}

export function InterestedPeopleProvider({
  eventId,
  children,
}: {
  eventId: number;
  children: React.ReactNode;
}) {
  const { user, ready: authReady } = useAuth();
  const { isFavorite, ready: favoritesReady } = useFavorites();
  const [snapshot, setSnapshot] = useState<Snapshot>({
    count: 0,
    people: [],
    includesMe: false,
    loading: true,
  });

  const userId = user?.id ?? null;
  const favorited = isFavorite(eventId);

  useEffect(() => {
    if (!authReady || !favoritesReady) return;

    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      // Le nombre se charge toujours ; seules les personnes attendent un compte.
      const [count, people] = await Promise.all([
        fetchInterestedCount(supabase, eventId),
        userId ? fetchInterestedPeople(supabase, eventId) : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setSnapshot({
        count,
        people: people.filter((person) => person.uid !== userId),
        includesMe: people.some((person) => person.uid === userId),
        loading: false,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, favoritesReady, eventId, userId]);

  // Mon propre intérêt est ajusté ici plutôt que par une relecture : le
  // contexte des favoris bascule de façon optimiste, avant que l'écriture ne
  // soit partie, et une relecture déclenchée sur ce basculement rapporte
  // l'ancien compte. L'écart est connu — c'est moi, et une seule personne —,
  // autant le corriger sans requête.
  const value = useMemo<InterestedPeopleContextValue>(() => {
    const delta = favorited === snapshot.includesMe ? 0 : favorited ? 1 : -1;
    return {
      count: Math.max(0, snapshot.count + delta),
      people: snapshot.people,
      loading: snapshot.loading,
    };
  }, [favorited, snapshot]);

  return (
    <InterestedPeopleContext.Provider value={value}>{children}</InterestedPeopleContext.Provider>
  );
}

export function useInterestedPeople() {
  const context = useContext(InterestedPeopleContext);
  if (!context) {
    throw new Error("useInterestedPeople doit être utilisé dans un InterestedPeopleProvider");
  }
  return context;
}
