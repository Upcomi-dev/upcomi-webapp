"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { Field, FIELD_INPUT_CLASS, Muted } from "@/components/ui/field";
import { GoogleAuthButton } from "./google-auth-button";

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  onSwitchToSignup?: () => void;
  onSwitchToForgotPassword?: () => void;
}

export function LoginForm({
  onSuccess,
  redirectTo = "/",
  onSwitchToSignup,
  onSwitchToForgotPassword,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      trackAnalyticsEvent("Login Submitted", { success: false });
      if (error.message.includes("Invalid login")) {
        setError("Email ou mot de passe incorrect");
      } else if (error.status === 429) {
        setError("Trop de tentatives. Réessayez dans une minute.");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    trackAnalyticsEvent("Login Submitted", { success: true });
    trackAnalyticsEvent("Login Completed");
    onSuccess?.();
    router.push(redirectTo);
    router.refresh();
    setLoading(false);
  }

  return (
    <div>
      <GoogleAuthButton mode="login" redirectTo={redirectTo} />

      <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/35">
        <span className="h-px flex-1 bg-foreground/10" />
        ou
        <span className="h-px flex-1 bg-foreground/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="rounded-[var(--radius-sm)] border border-red-200/60 bg-red-50/80 px-3.5 py-2.5 text-[13px] text-red-600">
            {error}
          </div>
        )}

        <Field label="Email" htmlFor="login-email">
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={FIELD_INPUT_CLASS}
            placeholder="ton@email.com"
          />
        </Field>

        <Field label="Mot de passe" htmlFor="login-password">
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={FIELD_INPUT_CLASS}
          />
          <div className="mt-1.5 text-right">
            {onSwitchToForgotPassword ? (
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-[11px] font-medium text-coral hover:text-coral-dark"
              >
                Oublié ?
              </button>
            ) : (
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-coral hover:text-coral-dark"
              >
                Oublié ?
              </Link>
            )}
          </div>
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-sm)] bg-coral py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,94,65,0.35)] transition-all hover:bg-coral-dark hover:shadow-[0_6px_24px_rgba(255,94,65,0.45)] disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <Muted className="mt-5 text-center">
        Pas encore de compte ?{" "}
        {onSwitchToSignup ? (
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-semibold text-coral hover:text-coral-dark"
          >
            S&apos;inscrire
          </button>
        ) : (
          <Link
            href="/signup"
            className="font-semibold text-coral hover:text-coral-dark"
          >
            S&apos;inscrire
          </Link>
        )}
      </Muted>
    </div>
  );
}
