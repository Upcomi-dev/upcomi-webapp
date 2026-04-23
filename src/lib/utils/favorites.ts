type DatedEvent = {
  dateEvent: string | null;
};

function getTodayKey(now = new Date()): string {
  return now.toISOString().split("T")[0];
}

function getEventDateKey(dateEvent: string | null): string | null {
  return dateEvent ? dateEvent.slice(0, 10) : null;
}

export function getVisibleFavoriteEvents<T extends DatedEvent>(
  events: T[],
  todayKey = getTodayKey()
): T[] {
  return events
    .filter((event) => {
      const eventDateKey = getEventDateKey(event.dateEvent);
      return eventDateKey !== null && eventDateKey >= todayKey;
    })
    .sort((a, b) => {
      const left = getEventDateKey(a.dateEvent) ?? "";
      const right = getEventDateKey(b.dateEvent) ?? "";
      return left.localeCompare(right);
    });
}

export function isVisibleFavoriteEvent(
  event: DatedEvent,
  todayKey = getTodayKey()
): boolean {
  const eventDateKey = getEventDateKey(event.dateEvent);
  return eventDateKey !== null && eventDateKey >= todayKey;
}
