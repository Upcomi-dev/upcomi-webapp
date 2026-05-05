"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface EventViewTrackerProps {
  eventId: number;
  eventType: string | null;
  bikeType: string | null;
  organizer: string | null;
}

export function EventViewTracker({
  eventId,
  eventType,
  bikeType,
  organizer,
}: EventViewTrackerProps) {
  useEffect(() => {
    trackAnalyticsEvent("Event Viewed", {
      event_id: eventId,
      event_type: eventType,
      bike_type: bikeType,
      organizer,
    });
  }, [bikeType, eventId, eventType, organizer]);

  return null;
}
