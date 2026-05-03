"use client";

import { track } from "@plausible-analytics/tracker";

export type AnalyticsEventName =
  | "Event Opened"
  | "Search Used"
  | "Filter Changed"
  | "Filters Cleared"
  | "Sort Changed"
  | "Mobile View Changed"
  | "Favorite Toggled"
  | "Share Used"
  | "External Registration Clicked"
  | "Auth Modal Opened"
  | "Login Submitted"
  | "Signup Submitted"
  | "Logout Clicked"
  | "Feedback Opened"
  | "Feedback Submitted";

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

function normalizeProps(props: AnalyticsProps = {}) {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    normalized[key] = String(value);
  }

  return normalized;
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  props?: AnalyticsProps
) {
  try {
    track(eventName, { props: normalizeProps(props) });
  } catch {
    // Analytics should never affect user-facing behavior.
  }
}
