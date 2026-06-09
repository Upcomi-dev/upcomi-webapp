import {
  compareEventsByStartDate,
  getLocalDateKey,
  isEventPast,
  isEventOngoingOrUpcoming,
  type EventDateRange,
} from "@/lib/utils/event-dates";

export const PAST_FAVORITES_PAGE_SIZE = 10;

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

export function getPastFavoriteEvents<T extends EventDateRange>(
  events: T[],
  todayKey = getLocalDateKey()
): T[] {
  return getSortedFavoriteEvents(
    events.filter((event) => isEventPast(event, todayKey))
  ).reverse();
}
