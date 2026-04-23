"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    onSuccess?.();
    router.push(redirectTo);
    router.refresh();
    setLoading(false);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="rounded-[var(--radius-sm)] border border-red-200/60 bg-red-50/80 px-3.5 py-2.5 text-[13px] text-red-600">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="soft-ring w-full rounded-[var(--radius-sm)] bg-white/58 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40"
            placeholder="ton@email.com"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40"
            >
              Mot de passe
            </label>
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
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="soft-ring w-full rounded-[var(--radius-sm)] bg-white/58 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-sm)] bg-coral py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,94,65,0.35)] transition-all hover:bg-coral-dark hover:shadow-[0_6px_24px_rgba(255,94,65,0.45)] disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <div className="mt-5 text-center text-[13px] text-foreground/45">
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
      </div>
    </div>
  );
}
