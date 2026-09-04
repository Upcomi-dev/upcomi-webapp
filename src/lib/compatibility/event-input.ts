import { getDateKey } from "@/lib/utils/event-dates";
import { parseBikeTypes, type CompatRoute } from "@/lib/compatibility/questions";
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
 * Les « parcours » du prototype sont ici les `sous_events`. Le type de vélo est
 * celui du parcours quand il est exploitable, sinon celui de l'évènement : un
 * `sous_events.bikeType` vide ou hors vocabulaire ne doit pas effacer la liste
 * de l'évènement, qui est souvent la mieux remplie des deux.
 */
export function buildCompatEvent(event: Event, sousEvents: SousEvent[]): CompatEventInput {
  const eventBikeTypes = parseBikeTypes(event.bike_type);
  const routes: CompatRoute[] = sousEvents.map((se, index) => {
    const routeBikeTypes = parseBikeTypes(se.bikeType);
    return {
      name: se.nom?.trim() || `Parcours ${index + 1}`,
      bikeTypes: routeBikeTypes.length > 0 ? routeBikeTypes : eventBikeTypes,
      distanceKm: se.distance,
      elevationM: se.elevation,
    };
  });

  return {
    name: event.nomEvent || "cet évènement",
    description: event.description,
    durationDays: getDurationDays(event.dateEvent, event.dateFin),
    distance: event.distance,
    routes,
  };
}
