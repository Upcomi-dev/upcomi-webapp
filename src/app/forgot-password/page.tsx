"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLogo } from "@/components/layout/app-logo";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9faeb]/30 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 text-4xl">📧</div>
          <h1 className="font-serif text-xl font-bold text-gray-900">
            Email envoyé
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Si un compte existe avec {email}, tu recevras un lien pour
            réinitialiser ton mot de passe.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-[#f59e42] hover:underline"
          >
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9faeb]/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <AppLogo
            href="/"
            priority
            className="justify-center"
            imageClassName="h-10 w-auto"
          />
          <p className="mt-2 text-sm text-gray-600">
            Entre ton email pour réinitialiser ton mot de passe
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#f59e42] focus:outline-none focus:ring-1 focus:ring-[#f59e42]"
              placeholder="ton@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#f59e42] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d47a1a] transition-colors disabled:opacity-50"
          >
            {loading ? "Envoi..." : "Envoyer le lien"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="text-[#f59e42] hover:underline">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
