import { formatDateValue, getDateKey, getLocalDateKey } from "@/lib/utils/event-dates";
import type { NearestStation } from "@/lib/utils/stations";
import {
  NO_REGISTRATION_MEASURES,
  type EventRegistrationMeasures,
} from "@/lib/events/registration-measures";

export interface KeyDatesEvent {
  nomEvent: string | null;
  dateEvent: string | null;
  dateFin: string | null;
  dateInscription: string | null;
  clotureInscription: string | null;
  villeDepart: string | null;
  paysDepart: string | null;
  distance: string | null;
}

export interface EventKeyDate {
  id: "ouverture" | "cloture" | "depart" | "arrivee";
  label: string;
  /** `null` quand la date n'est pas renseignée : le point reste affiché en « --/-- ». */
  dateKey: string | null;
  dateLabel: string;
  place: string | null;
  station: string | null;
  /** Précisions secondaires (durée, rythme, délai d'entraînement). */
  details: string[];
  /**
   * Ce que l'organisation met en place pour les femmes et minorités de genre à
   * ce moment-là. Mis en avant plutôt que rangé dans `details` : c'est souvent
   * l'information qui décide de s'inscrire, elle ne peut pas être grise.
   */
  highlights: string[];
  calendarUrl: string | null;
  /**
   * Proposer le rappel « M'envoyer un rappel » — seulement tant que
   * l'ouverture des inscriptions n'a pas eu lieu.
   */
  reminder: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30.44;

function toDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((toDate(toKey).getTime() - toDate(fromKey).getTime()) / MS_PER_DAY);
}

function formatShortDate(dateKey: string | null): string {
  if (!dateKey) return "--/--";
  return (
    formatDateValue(dateKey, "fr-FR", { day: "numeric", month: "long" }) ?? "--/--"
  );
}

/**
 * Kilométrage annoncé sur l'évènement — champ libre du type « 180 » ou
 * « 180 km ». Plusieurs valeurs (« 250 / 500 / 800 km ») décrivent autant de
 * parcours au choix : aucune ne vaut pour l'évènement entier, on renonce alors
 * plutôt que d'afficher un rythme calculé sur la mauvaise.
 */
function parseDistanceKm(distance: string | null): number | null {
  if (!distance) return null;
  const matches = distance.match(/\d[\d\s]*/g);
  if (!matches || matches.length !== 1) return null;
  const value = Number(matches[0].replace(/\s/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Lien Google Agenda pour une date clé, en évènement d'une journée. Pas de
 * backend ni de fichier .ics à télécharger : un rappel dans son propre agenda
 * en un clic, en complément du rappel Upcomi.
 */
export function buildCalendarUrl(
  dateKey: string,
  title: string,
  details: string
): string {
  const start = dateKey.replace(/-/g, "");
  const end = toDate(dateKey);
  end.setDate(end.getDate() + 1);
  const endKey = getLocalDateKey(end).replace(/-/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details,
    dates: `${start}/${endKey}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Les dates qui structurent la préparation, dans l'ordre où on les vit :
 * l'ouverture des inscriptions (qu'on peut rater), sa clôture, le départ, puis
 * l'arrivée. Un point sans date reste affiché — l'absence d'information est
 * elle-même une information sur l'évènement.
 */
export function getEventKeyDates(
  event: KeyDatesEvent,
  options: {
    station?: NearestStation | null;
    todayKey?: string;
    registrationMeasures?: EventRegistrationMeasures;
  } = {}
): EventKeyDate[] {
  const {
    station = null,
    todayKey = getLocalDateKey(),
    registrationMeasures = NO_REGISTRATION_MEASURES,
  } = options;

  const openKey = getDateKey(event.dateInscription);
  const closeKey = getDateKey(event.clotureInscription);
  const departureKey = getDateKey(event.dateEvent);
  const arrivalKey = getDateKey(event.dateFin);
  const eventName = event.nomEvent || "cet évènement";

  // Le temps qui reste entre l'ouverture des inscriptions et le départ : c'est
  // ce qui dit si l'objectif est atteignable, pas la date d'ouverture seule.
  const trainingMonths =
    openKey && departureKey
      ? Math.round(daysBetween(openKey, departureKey) / DAYS_PER_MONTH)
      : null;

  // Durée effective (départ et arrivée inclus). `dateFin` égale à `dateEvent`
  // décrit un évènement d'une journée, pas une arrivée le lendemain.
  const durationDays =
    departureKey && arrivalKey && arrivalKey > departureKey
      ? daysBetween(departureKey, arrivalKey) + 1
      : null;
  const distanceKm = parseDistanceKm(event.distance);
  const kmPerDay =
    durationDays && distanceKm ? Math.round(distanceKm / durationDays) : null;

  const departureDetails: string[] = [];
  if (durationDays) {
    departureDetails.push(
      `délai : ${durationDays} jours${kmPerDay ? ` (${kmPerDay} km par jour)` : ""}`
    );
  }

  const openDetails: string[] = [];
  if (trainingMonths && trainingMonths > 0) {
    openDetails.push(`${trainingMonths} mois pour t'entraîner`);
  }

  // Les deux dispositions se rattachent à l'ouverture des inscriptions : c'est
  // le moment où elles changent quelque chose pour la personne qui lit.
  const openHighlights: string[] = [];
  if (registrationMeasures.extendedDeadline) {
    openHighlights.push("Délais allongés pour les femmes et minorités de genre");
  }
  if (registrationMeasures.reservedSpots) {
    openHighlights.push("Places réservées pour les femmes et minorités de genre");
  }

  const dates: EventKeyDate[] = [
    {
      id: "ouverture",
      label: "Ouverture des inscriptions",
      dateKey: openKey,
      dateLabel: formatShortDate(openKey),
      place: null,
      station: null,
      details: openDetails,
      highlights: openHighlights,
      calendarUrl: openKey
        ? buildCalendarUrl(
            openKey,
            `Ouverture des inscriptions — ${eventName}`,
            `Ouverture des inscriptions pour ${eventName} sur Upcomi.`
          )
        : null,
      reminder: openKey !== null && openKey > todayKey,
    },
  ];

  // La clôture n'apparaît que si elle apporte quelque chose : une date connue,
  // distincte de l'ouverture.
  if (closeKey && closeKey !== openKey) {
    dates.push({
      id: "cloture",
      label: "Clôture des inscriptions",
      dateKey: closeKey,
      dateLabel: formatShortDate(closeKey),
      place: null,
      station: null,
      details: [],
      highlights: [],
      calendarUrl: buildCalendarUrl(
        closeKey,
        `Clôture des inscriptions — ${eventName}`,
        `Dernier jour pour s'inscrire à ${eventName} (vu sur Upcomi).`
      ),
      reminder: false,
    });
  }

  dates.push({
    id: "depart",
    label: "Départ",
    dateKey: departureKey,
    dateLabel: formatShortDate(departureKey),
    place: [event.villeDepart, event.paysDepart].filter(Boolean).join(", ") || null,
    station: station?.label ?? null,
    details: departureDetails,
    highlights: [],
    calendarUrl: null,
    reminder: false,
  });

  if (arrivalKey && departureKey && arrivalKey > departureKey) {
    dates.push({
      id: "arrivee",
      label: "Arrivée",
      dateKey: arrivalKey,
      dateLabel: formatShortDate(arrivalKey),
      place: null,
      station: null,
      details: [],
      highlights: [],
      calendarUrl: null,
      reminder: false,
    });
  }

  return dates;
}
