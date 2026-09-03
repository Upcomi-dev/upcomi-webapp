"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, FIELD_INPUT_CLASS, Muted } from "@/components/ui/field";

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
        <Muted className="mt-2">
          Si un compte existe avec {sentEmail}, tu recevras un lien pour
          réinitialiser ton mot de passe.
        </Muted>
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

        <Field label="Email" htmlFor="forgot-password-email">
          <input
            id="forgot-password-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className={FIELD_INPUT_CLASS}
            placeholder="ton@email.com"
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? "Envoi..." : "Envoyer le lien"}
        </button>
      </form>

      <Muted className="mt-5 text-center">
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
      </Muted>
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
