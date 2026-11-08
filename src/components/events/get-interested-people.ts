"use server";

import { createClient } from "@/lib/supabase/server";
import {
  fetchInterestedCount,
  fetchInterestedPeople,
  type InterestedPerson,
} from "@/lib/events/interested-people";

// Côté serveur : depuis l'anti-aspiration, le navigateur ne lit plus que ses
// propres favoris — les fonctions SQL (security invoker) n'y voyaient que soi.
// La liste reste réservée aux comptes connectés : la fonction n'est pas
// exécutable par `anon`, le client serveur porte la session de l'utilisatrice.
export async function getInterestedPeople(
  eventId: number,
  withPeople: boolean
): Promise<{ count: number; people: InterestedPerson[] }> {
  const supabase = await createClient();
  const [count, people] = await Promise.all([
    fetchInterestedCount(supabase, eventId),
    withPeople ? fetchInterestedPeople(supabase, eventId) : Promise.resolve([]),
  ]);
  return { count, people };
}
