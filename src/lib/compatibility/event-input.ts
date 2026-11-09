import { getDateKey } from "@/lib/utils/event-dates";
import { toBikeType, type CompatRoute } from "@/lib/compatibility/questions";
import type { CompatEventInput } from "@/lib/compatibility/scoring";
import type { Event, SousEvent } from "@/lib/types/database";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Durée en jours, départ et arrivée inclus. Même règle que les repères de la
 * carte (`facts.ts`) : sans `dateFin`, on ne sait rien — et une journée par
 * défaut ferait passer un ultra de huit jours pour une sortie du dimanche.
 */
function getDurationDays(dateEvent: string | null, dateFin: string | null): number | null {
  const startKey = getDateKey(dateEvent);
  const endKey = getDateKey(dateFin);
  if (!startKey || !endKey) return null;
  if (endKey <= startKey) return 1;

  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  return (
    Math.round(
      (new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime()) / MS_PER_DAY
    ) + 1
  );
}

/**
 * L'évènement, réduit à ce dont le score d'adéquation a besoin.
 *
 * **Uniquement des colonnes typées.** Les « parcours » du prototype sont ici
 * les `sous_events`, qui portent un type de vélo pris dans un vocabulaire
 * fermé, une distance en kilomètres et un dénivelé en mètres — trois colonnes
 * dédiées, pas trois façons de lire une phrase. La durée vient des deux dates.
 *
 * Rien n'est déduit de `events.bike_type` ni de `events.distance` : le premier
 * est la jonction par virgules des types de ses parcours, le second un champ
 * libre où « 250 / 500 / 800 km » décrit trois parcours au choix. Les lire
 * demandait de découper du texte pour retrouver ce que `sous_events` porte
 * déjà proprement.
 *
 * Un évènement sans parcours n'a donc ni terrain, ni distance, ni dénivelé : le
 * questionnaire se limite au socle commun et les critères correspondants
 * disparaissent. C'est le comportement voulu — une donnée absente ne se devine
 * pas.
 */
export function buildCompatEvent(event: Event, sousEvents: SousEvent[]): CompatEventInput {
  const routes: CompatRoute[] = sousEvents.map((se, index) => ({
    name: se.nom?.trim() || `Parcours ${index + 1}`,
    bikeType: toBikeType(se.bikeType),
    distanceKm: se.distance,
    elevationM: se.elevation,
  }));

  return {
    name: event.nomEvent || "cet évènement",
    durationDays: getDurationDays(event.dateEvent, event.dateFin),
    routes,
  };
}
