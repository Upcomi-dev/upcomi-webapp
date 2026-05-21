import {
  compareEventsByStartDate,
  getLocalDateKey,
  isEventOngoingOrUpcoming,
  type EventDateRange,
} from "@/lib/utils/event-dates";

export function getSortedFavoriteEvents<T extends EventDateRange>(events: T[]): T[] {
  return [...events].sort(compareEventsByStartDate);
}

export function getVisibleFavoriteEvents<T extends EventDateRange>(
  events: T[],
  todayKey = getLocalDateKey()
): T[] {
  return getSortedFavoriteEvents(
    events.filter((event) => isEventOngoingOrUpcoming(event, todayKey))
  );
}

export function isVisibleFavoriteEvent(
  event: EventDateRange,
  todayKey = getLocalDateKey()
): boolean {
  return isEventOngoingOrUpcoming(event, todayKey);
}
