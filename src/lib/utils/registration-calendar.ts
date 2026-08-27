import { getDateKey, getLocalDateKey } from "@/lib/utils/event-dates";

export interface RegistrationEvent {
  id: number;
  slug: string | null;
  nomEvent: string | null;
  dateEvent: string | null;
  dateFin: string | null;
  villeDepart: string | null;
  paysDepart: string | null;
  type_event: string | null;
  dateInscription: string | null;
}

export type RegistrationStatus = "a-venir" | "populaire" | "ouvert";

/**
 * Le code couleur porte sur la disponibilité des inscriptions, jamais sur le
 * type ou la difficulté de l'événement : en test utilisateur, le vert/orange
 * hérité des types était lu comme un niveau de difficulté.
 */
export const REGISTRATION_STATUSES: Record<
  RegistrationStatus,
  { label: string; color: string }
> = {
  "a-venir": { label: "Pas encore ouvertes", color: "#9a938c" },
  populaire: { label: "Ouvertes — évènement populaire", color: "#e8a33d" },
  ouvert: { label: "Ouvertes — places disponibles", color: "#4e9c6b" },
};

export function getRegistrationStatus(
  event: Pick<RegistrationEvent, "dateInscription">,
  isPopular: boolean,
  todayKey = getLocalDateKey()
): RegistrationStatus {
  const openDateKey = getDateKey(event.dateInscription);

  if (openDateKey !== null && openDateKey > todayKey) {
    return "a-venir";
  }

  return isPopular ? "populaire" : "ouvert";
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);
}

export function formatMonthLabel(year: number, monthIndex: number): string {
  return capitalize(
    new Date(year, monthIndex, 1).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    })
  );
}

export function formatWeekdayLabel(year: number, monthIndex: number, day: number): string {
  return capitalize(
    new Date(year, monthIndex, day).toLocaleDateString("fr-FR", { weekday: "short" })
  ).replace(".", "");
}

export interface RegistrationMonthGroup {
  key: string;
  label: string;
  events: RegistrationEvent[];
}

/**
 * Regroupe par mois d'ouverture. Les événements sont supposés déjà triés par
 * `dateInscription` croissante (l'ordre vient de la requête Supabase).
 */
export function groupByRegistrationMonth(
  events: RegistrationEvent[]
): RegistrationMonthGroup[] {
  const groups: RegistrationMonthGroup[] = [];

  for (const event of events) {
    const openDateKey = getDateKey(event.dateInscription);
    if (!openDateKey) continue;

    const [year, month] = openDateKey.split("-").map(Number);
    const key = `${year}-${String(month).padStart(2, "0")}`;

    if (groups.at(-1)?.key !== key) {
      groups.push({ key, label: formatMonthLabel(year, month - 1), events: [] });
    }

    groups.at(-1)?.events.push(event);
  }

  return groups;
}

export function groupByRegistrationDay(
  events: RegistrationEvent[]
): Map<string, RegistrationEvent[]> {
  const byDay = new Map<string, RegistrationEvent[]>();

  for (const event of events) {
    const openDateKey = getDateKey(event.dateInscription);
    if (!openDateKey) continue;

    const existing = byDay.get(openDateKey);
    if (existing) {
      existing.push(event);
    } else {
      byDay.set(openDateKey, [event]);
    }
  }

  return byDay;
}

export interface CalendarDayCell {
  dayNumber: number;
  dateKey: string;
  isToday: boolean;
  events: RegistrationEvent[];
}

function toDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Construit la grille mensuelle : le nombre de cases vides à placer avant le
 * 1er du mois (lundi = 0), puis une case par jour portant ses ouvertures.
 */
export function buildCalendarMonth(
  year: number,
  monthIndex: number,
  eventsByDay: Map<string, RegistrationEvent[]>,
  todayKey = getLocalDateKey()
): { leadingBlanks: number; days: CalendarDayCell[] } {
  const leadingBlanks = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days: CalendarDayCell[] = [];

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const dateKey = toDateKey(year, monthIndex, dayNumber);
    days.push({
      dayNumber,
      dateKey,
      isToday: dateKey === todayKey,
      events: eventsByDay.get(dateKey) ?? [],
    });
  }

  return { leadingBlanks, days };
}
