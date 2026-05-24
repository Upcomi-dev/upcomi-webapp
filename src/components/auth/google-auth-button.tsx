"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { sanitizeRedirectPath } from "@/lib/profile";

interface GoogleAuthButtonProps {
  mode: "login" | "signup";
  redirectTo?: string;
}

export function GoogleAuthButton({
  mode,
  redirectTo = "/",
}: GoogleAuthButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const actionLabel = mode === "login" ? "Se connecter" : "S'inscrire";

  async function handleGoogleAuth() {
    setError(null);
    setLoading(true);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", sanitizeRedirectPath(redirectTo));
    callbackUrl.searchParams.set("mode", mode);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      trackAnalyticsEvent(mode === "login" ? "Login Submitted" : "Signup Submitted", {
        method: "google",
        success: false,
      });
      setError("Impossible de lancer la connexion Google. Réessaie dans un instant.");
      setLoading(false);
    } else {
      trackAnalyticsEvent(mode === "login" ? "Login Submitted" : "Signup Submitted", {
        method: "google",
        success: true,
      });
    }
  }

  return (
    <div className="space-y-2.5">
      {error && (
        <div className="rounded-[var(--radius-sm)] border border-red-200/60 bg-red-50/80 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        className="soft-ring flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-sm)] bg-white/72 px-3.5 py-3 text-sm font-semibold text-foreground transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40 disabled:opacity-50"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
        >
          <path
            fill="#4285F4"
            d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.44Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.41 13.89a6.01 6.01 0 0 1 0-3.78V7.52H3.07a10 10 0 0 0 0 8.96l3.34-2.59Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.99c1.47 0 2.8.51 3.84 1.5l2.87-2.87C16.96 3 14.7 2 12 2a10 10 0 0 0-8.93 5.52l3.34 2.59C7.2 7.75 9.4 5.99 12 5.99Z"
          />
        </svg>
        {loading ? "Redirection..." : `${actionLabel} avec Google`}
      </button>
    </div>
  );
}
