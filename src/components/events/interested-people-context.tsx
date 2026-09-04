"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import {
  fetchInterestedCount,
  fetchInterestedPeople,
  fetchInterestedTierCounts,
  type InterestedPerson,
  type InterestedTierCounts,
} from "@/lib/events/interested-people";

/**
 * Les personnes intéressées par l'évènement affiché, chargées **une fois** pour
 * toute la fiche : le bloc du haut, le score d'adéquation et la feuille de
 * personnes lisent tous les trois la même liste.
 *
 * Les trois lectures ne viennent pas de la même source, et c'est volontaire :
 * les **nombres** sont publics (`get_event_interested_count` pour le total,
 * `get_event_interested_levels` pour la répartition par palier), les
 * **personnes** ne le sont pas (`get_event_interested_people`, réservée aux
 * comptes connectés). Une personne déconnectée voit donc combien elles sont et
 * combien lui ressemblent, jamais qui elles sont.
 */

interface InterestedPeopleContextValue {
  /** Total, moi comprise. */
  count: number;
  /** Les **autres** : on ne se présente pas à soi-même dans la liste. */
  people: InterestedPerson[];
  /** Les autres, par palier d'expérience — renseigné même sans compte. */
  tierCounts: InterestedTierCounts;
  /** `true` tant que le premier chargement n'est pas terminé. */
  loading: boolean;
}

const InterestedPeopleContext = createContext<InterestedPeopleContextValue | null>(null);

interface Snapshot {
  count: number;
  people: InterestedPerson[];
  tierCounts: InterestedTierCounts;
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
    tierCounts: new Map(),
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
      // Les deux nombres se chargent toujours ; seules les personnes attendent
      // un compte.
      const [count, tierCounts, people] = await Promise.all([
        fetchInterestedCount(supabase, eventId),
        fetchInterestedTierCounts(supabase, eventId),
        userId ? fetchInterestedPeople(supabase, eventId) : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setSnapshot({
        count,
        people: people.filter((person) => person.uid !== userId),
        tierCounts,
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
  //
  // `tierCounts` échappe à ce rattrapage : la fonction SQL m'exclut déjà, et
  // ces paliers-là comptent les autres. Me dire intéressée ne change pas
  // combien de personnes me ressemblent.
  const value = useMemo<InterestedPeopleContextValue>(() => {
    const delta = favorited === snapshot.includesMe ? 0 : favorited ? 1 : -1;
    return {
      count: Math.max(0, snapshot.count + delta),
      people: snapshot.people,
      tierCounts: snapshot.tierCounts,
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
