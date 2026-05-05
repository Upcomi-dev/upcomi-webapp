"use client";

export type AnalyticsEventName =
  | "Event Opened"
  | "Event Viewed"
  | "Search Used"
  | "Filter Changed"
  | "Filters Cleared"
  | "Sort Changed"
  | "Mobile View Changed"
  | "Favorite Toggled"
  | "Favorite Added"
  | "Share Used"
  | "External Registration Clicked"
  | "Auth Modal Opened"
  | "Login Submitted"
  | "Login Completed"
  | "Signup Submitted"
  | "Signup Completed"
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
  if (typeof window === "undefined") return;

  const plausibleProps = normalizeProps(props);

  try {
    void import("@plausible-analytics/tracker").then(({ track }) => {
      track(eventName, { props: plausibleProps });
    }).catch(() => {
      // Analytics should never affect user-facing behavior.
    });
  } catch {
    // Analytics should never affect user-facing behavior.
  }

  try {
    void import("@vercel/analytics").then(({ track }) => {
      track(eventName, props);
    }).catch(() => {
      // Analytics should never affect user-facing behavior.
    });
  } catch {
    // Analytics should never affect user-facing behavior.
  }
}
