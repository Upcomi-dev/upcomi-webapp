"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface ForgotPasswordFormProps {
  onSwitchToLogin?: () => void;
}

export function ForgotPasswordForm({
  onSwitchToLogin,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) {
      setError(getForgotPasswordErrorMessage(error.message));
      setLoading(false);
      return;
    }

    setSentEmail(normalizedEmail);
    setLoading(false);
  }

  if (sentEmail) {
    return (
      <div className="text-center">
        <h3 className="font-serif text-xl font-bold text-foreground">
          Email envoyé
        </h3>
        <p className="mt-2 text-sm leading-6 text-foreground/58">
          Si un compte existe avec {sentEmail}, tu recevras un lien pour
          réinitialiser ton mot de passe.
        </p>
        {onSwitchToLogin ? (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="mt-5 text-[13px] font-semibold text-coral hover:text-coral-dark"
          >
            Retour à la connexion
          </button>
        ) : (
          <Link
            href="/login"
            className="mt-5 inline-block text-[13px] font-semibold text-coral hover:text-coral-dark"
          >
            Retour à la connexion
          </Link>
        )}
      </div>
    );
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
            htmlFor="forgot-password-email"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40"
          >
            Email
          </label>
          <input
            id="forgot-password-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="soft-ring w-full rounded-[var(--radius-sm)] bg-white/58 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40"
            placeholder="ton@email.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-sm)] bg-coral py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,94,65,0.35)] transition-all hover:bg-coral-dark hover:shadow-[0_6px_24px_rgba(255,94,65,0.45)] disabled:opacity-50"
        >
          {loading ? "Envoi..." : "Envoyer le lien"}
        </button>
      </form>

      <div className="mt-5 text-center text-[13px] text-foreground/45">
        {onSwitchToLogin ? (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-coral hover:text-coral-dark"
          >
            Retour à la connexion
          </button>
        ) : (
          <Link
            href="/login"
            className="font-semibold text-coral hover:text-coral-dark"
          >
            Retour à la connexion
          </Link>
        )}
      </div>
    </div>
  );
}

function getForgotPasswordErrorMessage(message: string) {
  if (
    message
      .toLowerCase()
      .includes("for security purposes, you can only request this after")
  ) {
    const seconds = message.match(/after (\d+) seconds?/i)?.[1];
    return seconds
      ? `Pour des raisons de sécurité, tu pourras refaire une demande dans ${seconds} secondes.`
      : "Pour des raisons de sécurité, patiente quelques secondes avant de refaire une demande.";
  }

  return message;
}
