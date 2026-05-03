"use client";

import { useCallback, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface ShareButtonProps {
  title: string;
  url: string;
  eventId?: number;
}

export function ShareButton({ title, url, eventId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const fullUrl = `${window.location.origin}${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl });
        trackAnalyticsEvent("Share Used", {
          event_id: eventId,
          method: "native",
          success: true,
        });
      } catch {
        trackAnalyticsEvent("Share Used", {
          event_id: eventId,
          method: "native",
          success: false,
        });
        // User cancelled share
      }
      return;
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      trackAnalyticsEvent("Share Used", {
        event_id: eventId,
        method: "clipboard",
        success: true,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      trackAnalyticsEvent("Share Used", {
        event_id: eventId,
        method: "clipboard",
        success: false,
      });
      // Clipboard API not available
    }
  }, [eventId, title, url]);

  return (
    <button
      onClick={handleShare}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/45 bg-white/58 text-foreground/35 transition-colors hover:border-foreground/25 hover:text-foreground/60"
      aria-label="Partager"
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )}
    </button>
  );
}
