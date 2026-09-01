"use client";

import { AppLogo } from "@/components/layout/app-logo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AuthGate } from "./auth-gate";
import { ForgotPasswordForm } from "./forgot-password-form";
import { LoginForm } from "./login-form";
import { SignupWizard } from "./signup-wizard";
import { useAuthModal, type AuthModalView } from "./auth-modal-context";

export function AuthModal() {
  const { isOpen, view, redirectAfterAuth, gateTitle, closeAuthModal, setView } =
    useAuthModal();

  return (
    <AuthModalDialog
      open={isOpen}
      view={view}
      redirectTo={redirectAfterAuth}
      gateTitle={gateTitle}
      onClose={closeAuthModal}
      onViewChange={setView}
    />
  );
}

interface AuthModalDialogProps {
  open: boolean;
  view: AuthModalView;
  redirectTo?: string;
  gateTitle?: string;
  onClose?: () => void;
  onViewChange: (view: AuthModalView) => void;
  showCloseButton?: boolean;
}

export function AuthModalDialog({
  open,
  view,
  redirectTo = "/",
  gateTitle,
  onClose,
  onViewChange,
  showCloseButton = true,
}: AuthModalDialogProps) {
  // Le gate et le parcours d'inscription portent leur propre titre (celui du
  // geste pour l'un, celui de l'étape en cours pour l'autre) : le header du
  // dialogue ne garde alors que le logo.
  const hasOwnTitle = view === "gate" || view === "signup";
  const closeOnAuthSuccess = showCloseButton ? onClose : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <DialogContent
        className={`gap-0 p-0 ${view === "signup" ? "sm:max-w-[440px]" : "sm:max-w-[400px]"}`}
        showCloseButton={showCloseButton}
      >
        {/* Header with gradient mesh */}
        <div className={`hero-mesh relative px-6 pt-7 ${hasOwnTitle ? "pb-4" : "pb-5"}`}>
          <AppLogo href="/" imageClassName="h-8 w-auto" />
          {!hasOwnTitle && (
            <>
              <h2 className="mt-4 font-serif text-[22px] font-bold leading-tight text-foreground">
                {view === "login" ? "Connexion" : "Mot de passe oublié"}
              </h2>
              <p className="mt-1.5 text-[13px] text-foreground/52">
                {view === "login"
                  ? "Connecte-toi pour retrouver tes événements favoris"
                  : "Reçois un lien pour choisir un nouveau mot de passe"}
              </p>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />

        {/* Form */}
        <div className="px-6 pt-5 pb-6">
          {view === "gate" ? (
            <AuthGate
              title={gateTitle}
              onSignup={() => onViewChange("signup")}
              onLogin={() => onViewChange("login")}
            />
          ) : view === "login" ? (
            <LoginForm
              redirectTo={redirectTo}
              onSuccess={closeOnAuthSuccess}
              onSwitchToSignup={() => onViewChange("signup")}
              onSwitchToForgotPassword={() => onViewChange("forgot-password")}
            />
          ) : view === "forgot-password" ? (
            <ForgotPasswordForm onSwitchToLogin={() => onViewChange("login")} />
          ) : (
            <SignupWizard
              redirectTo={redirectTo}
              onDone={closeOnAuthSuccess}
              onSwitchToLogin={() => onViewChange("login")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
