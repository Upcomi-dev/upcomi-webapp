export type EventDateRange = {
  dateEvent: string | null;
  dateFin?: string | null;
};

export function getLocalDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const dateKey = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : null;
}

export function formatDateValue(
  value: string | null | undefined,
  locales: Intl.LocalesArgument,
  options: Intl.DateTimeFormatOptions
): string | null {
  const dateKey = getDateKey(value);
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(locales, options);
}

export function getEventEndDateKey(event: EventDateRange): string | null {
  return getDateKey(event.dateFin) ?? getDateKey(event.dateEvent);
}

export function hasEventStartDate(event: EventDateRange): boolean {
  return getDateKey(event.dateEvent) !== null;
}

export function isEventPast(
  event: EventDateRange,
  todayKey = getLocalDateKey()
): boolean {
  const endDateKey = getEventEndDateKey(event);
  return endDateKey !== null && endDateKey < todayKey;
}

export function isEventOngoingOrUpcoming(
  event: EventDateRange,
  todayKey = getLocalDateKey()
): boolean {
  const endDateKey = getEventEndDateKey(event);
  return endDateKey !== null && endDateKey >= todayKey;
}

export function compareEventsByStartDate(a: EventDateRange, b: EventDateRange): number {
  const left = getDateKey(a.dateEvent) ?? "";
  const right = getDateKey(b.dateEvent) ?? "";
  return left.localeCompare(right);
}
