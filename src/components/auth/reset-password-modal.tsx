"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { AppLogo } from "@/components/layout/app-logo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  getPasswordRequirementsMessage,
  isPasswordValid,
  PASSWORD_MIN_LENGTH,
  translatePasswordError,
} from "@/lib/auth/password";
import { PASSWORD_RECOVERY_PENDING_KEY } from "@/lib/auth/recovery";
import { Field, FIELD_INPUT_CLASS, Muted } from "@/components/ui/field";
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
    let invalidTimer: number | null = null;
    let recoverySubscription: { unsubscribe: () => void } | null = null;

    const unsubscribeRecovery = () => {
      recoverySubscription?.unsubscribe();
      recoverySubscription = null;
    };

    async function prepareRecoverySession() {
      const supabase = createClient();
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      let hasRecoverySession =
        window.sessionStorage.getItem(PASSWORD_RECOVERY_PENDING_KEY) === "true";
      const hasCode = searchParams.has("code");
      const hasRecoveryParams =
        searchParams.get("type") === "recovery" ||
        hashParams.get("type") === "recovery" ||
        hashParams.has("access_token");
      const urlError =
        searchParams.get("error_description") ||
        hashParams.get("error_description");

      const markReady = () => {
        if (!active) return;
        if (invalidTimer !== null) {
          window.clearTimeout(invalidTimer);
          invalidTimer = null;
        }
        hasRecoverySession = true;
        window.sessionStorage.setItem(PASSWORD_RECOVERY_PENDING_KEY, "true");
        setLinkState("ready");
      };

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          markReady();
        }
      });
      recoverySubscription = subscription;

      if (urlError) {
        unsubscribeRecovery();
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
      if (sessionError || !session) {
        unsubscribeRecovery();
        setLinkError(sessionError?.message ?? null);
        setLinkState("invalid");
        return;
      }

      if (hasRecoverySession || hasRecoveryParams) {
        markReady();
        unsubscribeRecovery();
        return;
      }

      if (hasCode) {
        invalidTimer = window.setTimeout(() => {
          if (!active || hasRecoverySession) return;
          unsubscribeRecovery();
          setLinkState("invalid");
        }, 300);
        return;
      }

      unsubscribeRecovery();
      setLinkState("invalid");
    }

    void prepareRecoverySession();

    return () => {
      active = false;
      if (invalidTimer !== null) {
        window.clearTimeout(invalidTimer);
      }
      unsubscribeRecovery();
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

    window.sessionStorage.removeItem(PASSWORD_RECOVERY_PENDING_KEY);
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
          <Muted className="mt-1.5">Choisis un mot de passe sécurisé pour ton compte</Muted>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />

        <div className="px-6 pt-5 pb-6">
          {linkState === "checking" ? (
            <Muted className="text-center">Vérification du lien en cours...</Muted>
          ) : linkState === "invalid" ? (
            <div className="text-center">
              <h3 className="font-serif text-xl font-bold text-foreground">
                Lien expiré ou invalide
              </h3>
              <Muted className="mt-2">
                {linkError ||
                  "Demande un nouveau lien pour réinitialiser ton mot de passe."}
              </Muted>
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

              <Field label="Nouveau mot de passe" htmlFor="new-password">
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  autoComplete="new-password"
                  className={FIELD_INPUT_CLASS}
                />
                <PasswordRequirements password={password} />
              </Field>

              <Field label="Confirmer le mot de passe" htmlFor="new-password-confirmation">
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
                  className={FIELD_INPUT_CLASS}
                />
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
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
              <Muted className="mt-1.5">Vérification du lien en cours...</Muted>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <ResetPasswordModalContent />
    </Suspense>
  );
}
