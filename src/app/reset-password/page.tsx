"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLogo } from "@/components/layout/app-logo";
import { createClient } from "@/lib/supabase/client";

type LinkState = "checking" | "ready" | "invalid";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      const supabase = createClient();
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const hasRecoveryParams =
        searchParams.has("code") ||
        hashParams.get("type") === "recovery" ||
        hashParams.has("access_token");
      const urlError =
        searchParams.get("error_description") ||
        hashParams.get("error_description");

      if (urlError) {
        if (!active) return;
        setLinkError(urlError);
        setLinkState("invalid");
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!active) return;
      if (sessionError || !session || !hasRecoveryParams) {
        setLinkError(sessionError?.message ?? null);
        setLinkState("invalid");
        return;
      }

      setLinkState("ready");
    }

    void prepareRecoverySession();

    return () => {
      active = false;
    };
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (linkState === "checking") {
    return (
      <AuthShell description="Vérification du lien de réinitialisation">
        <div
          className="rounded-xl bg-white p-6 text-center text-sm text-[#7C7C7C]"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          Vérification en cours...
        </div>
      </AuthShell>
    );
  }

  if (linkState === "invalid") {
    return (
      <AuthShell description="Ce lien n'est plus valide">
        <div
          className="rounded-xl bg-white p-6 text-center"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <h1 className="font-serif text-xl font-bold text-gray-900">
            Lien expiré ou invalide
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {linkError ||
              "Demande un nouveau lien pour réinitialiser ton mot de passe."}
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-block text-sm font-medium text-coral hover:text-coral-dark"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell description="Choisis ton nouveau mot de passe">
      <div
        className="rounded-xl bg-white p-6"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="rounded-[var(--radius-sm)] border border-red-200/60 bg-red-50/80 px-3.5 py-2.5 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40"
            >
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="soft-ring w-full rounded-[var(--radius-sm)] bg-white/58 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40"
            />
          </div>

          <div>
            <label
              htmlFor="new-password-confirmation"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40"
            >
              Confirmer le mot de passe
            </label>
            <input
              id="new-password-confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(event) =>
                setPasswordConfirmation(event.target.value)
              }
              required
              minLength={6}
              autoComplete="new-password"
              className="soft-ring w-full rounded-[var(--radius-sm)] bg-white/58 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[var(--radius-sm)] bg-coral py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,94,65,0.35)] transition-all hover:bg-coral-dark hover:shadow-[0_6px_24px_rgba(255,94,65,0.45)] disabled:opacity-50"
          >
            {loading ? "Mise à jour..." : "Modifier le mot de passe"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}

function AuthShell({
  children,
  description,
}: {
  children: React.ReactNode;
  description: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5efe6] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <AppLogo
            href="/"
            priority
            className="justify-center"
            imageClassName="h-10 w-auto"
          />
          <p className="mt-3 text-sm text-[#7C7C7C]">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell description="Vérification du lien de réinitialisation">
          <div
            className="rounded-xl bg-white p-6 text-center text-sm text-[#7C7C7C]"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            Vérification en cours...
          </div>
        </AuthShell>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
