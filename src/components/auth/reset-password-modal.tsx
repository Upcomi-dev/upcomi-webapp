"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLogo } from "@/components/layout/app-logo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  getPasswordRequirementsMessage,
  isPasswordValid,
  PASSWORD_MIN_LENGTH,
  translatePasswordError,
} from "@/lib/auth/password";
import { PasswordRequirements } from "./password-requirements";

type LinkState = "checking" | "ready" | "invalid";

function ResetPasswordModalContent() {
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

    if (!isPasswordValid(password)) {
      setError(getPasswordRequirementsMessage());
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
      setError(translatePasswordError(updateError.message));
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <Dialog open>
      <DialogContent
        className="gap-0 p-0 sm:max-w-[400px]"
        showCloseButton={false}
      >
        <div className="hero-mesh relative px-6 pt-7 pb-5">
          <AppLogo href="/" imageClassName="h-8 w-auto" />
          <h2 className="mt-4 font-serif text-[22px] font-bold leading-tight text-foreground">
            Nouveau mot de passe
          </h2>
          <p className="mt-1.5 text-[13px] text-foreground/52">
            Choisis un mot de passe sécurisé pour ton compte
          </p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />

        <div className="px-6 pt-5 pb-6">
          {linkState === "checking" ? (
            <p className="text-center text-sm text-foreground/58">
              Vérification du lien en cours...
            </p>
          ) : linkState === "invalid" ? (
            <div className="text-center">
              <h3 className="font-serif text-xl font-bold text-foreground">
                Lien expiré ou invalide
              </h3>
              <p className="mt-2 text-sm leading-6 text-foreground/58">
                {linkError ||
                  "Demande un nouveau lien pour réinitialiser ton mot de passe."}
              </p>
              <Link
                href="/forgot-password"
                className="mt-5 inline-block text-[13px] font-semibold text-coral hover:text-coral-dark"
              >
                Demander un nouveau lien
              </Link>
            </div>
          ) : (
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
                  minLength={PASSWORD_MIN_LENGTH}
                  autoComplete="new-password"
                  className="soft-ring w-full rounded-[var(--radius-sm)] bg-white/58 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40"
                />
                <PasswordRequirements password={password} />
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
                  minLength={PASSWORD_MIN_LENGTH}
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ResetPasswordModal() {
  return (
    <Suspense
      fallback={
        <Dialog open>
          <DialogContent
            className="gap-0 p-0 sm:max-w-[400px]"
            showCloseButton={false}
          >
            <div className="hero-mesh relative px-6 pt-7 pb-5">
              <AppLogo href="/" imageClassName="h-8 w-auto" />
              <h2 className="mt-4 font-serif text-[22px] font-bold leading-tight text-foreground">
                Nouveau mot de passe
              </h2>
              <p className="mt-1.5 text-[13px] text-foreground/52">
                Vérification du lien en cours...
              </p>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <ResetPasswordModalContent />
    </Suspense>
  );
}
