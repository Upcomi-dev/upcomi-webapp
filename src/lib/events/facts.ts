import { getDateKey } from "@/lib/utils/event-dates";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface EventFactsInput {
  dateEvent: string | null;
  dateFin?: string | null;
  distance?: string | null;
  maxElevation?: number | null;
}

/**
 * Durée de l'évènement, départ et arrivée inclus. `dateFin` égale à
 * `dateEvent` décrit une sortie à la journée, pas une arrivée le lendemain ;
 * `dateFin` absente ne dit rien de la durée — mieux vaut alors ne pas afficher
 * de repère que d'annoncer une journée par défaut.
 */
export function formatDurationLabel(
  dateEvent: string | null,
  dateFin: string | null | undefined
): string | null {
  const startKey = getDateKey(dateEvent);
  const endKey = getDateKey(dateFin);
  if (!startKey || !endKey) return null;
  if (endKey <= startKey) return "1 journée";

  const [startYear, startMonth, startDay] = startKey.split("-").map(Number);
  const [endYear, endMonth, endDay] = endKey.split("-").map(Number);
  const days =
    Math.round(
      (new Date(endYear, endMonth - 1, endDay).getTime() -
        new Date(startYear, startMonth - 1, startDay).getTime()) /
        MS_PER_DAY
    ) + 1;

  return `${days} jours`;
}

/** Kilométrage annoncé — champ libre du type « 180 » ou « 180 km ». */
export function formatDistanceLabel(distance: string | null | undefined): string | null {
  const value = distance?.trim();
  if (!value) return null;
  return /\bkm\b/i.test(value) ? value : `${value} km`;
}

/**
 * Distance et dénivelé dans un même repère : séparés, le dénivelé se perdait
 * entre la durée et la date. Les deux se lisent toujours ensemble.
 */
export function formatDistanceElevationLabel(
  distance: string | null | undefined,
  maxElevation: number | null | undefined
): string | null {
  const distanceLabel = formatDistanceLabel(distance);
  const elevationLabel =
    typeof maxElevation === "number" && maxElevation > 0 ? `${maxElevation} m D+` : null;

  return [distanceLabel, elevationLabel].filter(Boolean).join(" · ") || null;
}

/**
 * Les repères d'un évènement : durée, puis distance et dénivelé.
 *
 * Le même jeu est posé sur la carte d'évènement et sur le visuel de la fiche,
 * pour retrouver en haut de fiche ce sur quoi on vient de filtrer.
 */
export function getEventFactTags(event: EventFactsInput): string[] {
  return [
    formatDurationLabel(event.dateEvent, event.dateFin),
    formatDistanceElevationLabel(event.distance, event.maxElevation),
  ].filter((fact): fact is string => Boolean(fact));
}
