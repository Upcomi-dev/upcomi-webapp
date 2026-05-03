"use client";

import type { CSSProperties, ReactNode } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface ExternalRegistrationLinkProps {
  href: string;
  eventId: number;
  eventType: string | null;
  organizer: string | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function ExternalRegistrationLink({
  href,
  eventId,
  eventType,
  organizer,
  className,
  style,
  children,
}: ExternalRegistrationLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        trackAnalyticsEvent("External Registration Clicked", {
          event_id: eventId,
          event_type: eventType,
          organizer,
        });
      }}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
