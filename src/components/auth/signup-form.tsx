"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SignupFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  onSwitchToLogin?: () => void;
}

export function SignupForm({
  onSuccess,
  redirectTo = "/",
  onSwitchToLogin,
}: SignupFormProps) {
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
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      if (error.message.includes("already registered")) {
        setError("Un compte existe déjà avec cet email");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
    onSuccess?.();
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
            htmlFor="signup-email"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40"
          >
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="soft-ring w-full rounded-[var(--radius-sm)] bg-white/58 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40"
            placeholder="ton@email.com"
          />
        </div>

        <div>
          <label
            htmlFor="signup-password"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40"
          >
            Mot de passe
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="soft-ring w-full rounded-[var(--radius-sm)] bg-white/58 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40"
            placeholder="6 caractères minimum"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-sm)] bg-coral py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,94,65,0.35)] transition-all hover:bg-coral-dark hover:shadow-[0_6px_24px_rgba(255,94,65,0.45)] disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>

      <div className="mt-5 text-center text-[13px] text-foreground/45">
        Déjà un compte ?{" "}
        {onSwitchToLogin ? (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-coral hover:text-coral-dark"
          >
            Se connecter
          </button>
        ) : (
          <a
            href="/login"
            className="font-semibold text-coral hover:text-coral-dark"
          >
            Se connecter
          </a>
        )}
      </div>
    </div>
  );
}
