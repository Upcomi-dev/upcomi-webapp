"use client";

import { AppLogo } from "@/components/layout/app-logo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ForgotPasswordForm } from "./forgot-password-form";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";
import { useAuthModal } from "./auth-modal-context";

export function AuthModal() {
  const { isOpen, view, redirectAfterAuth, closeAuthModal, setView } =
    useAuthModal();

  return (
    <AuthModalDialog
      open={isOpen}
      view={view}
      redirectTo={redirectAfterAuth}
      onClose={closeAuthModal}
      onViewChange={setView}
    />
  );
}

interface AuthModalDialogProps {
  open: boolean;
  view: "login" | "signup" | "forgot-password";
  redirectTo?: string;
  onClose?: () => void;
  onViewChange: (view: "login" | "signup" | "forgot-password") => void;
  showCloseButton?: boolean;
}

export function AuthModalDialog({
  open,
  view,
  redirectTo = "/",
  onClose,
  onViewChange,
  showCloseButton = true,
}: AuthModalDialogProps) {
  const isForgotPassword = view === "forgot-password";
  const closeOnAuthSuccess = showCloseButton ? onClose : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-[400px]"
        showCloseButton={showCloseButton}
      >
        {/* Header with gradient mesh */}
        <div className="hero-mesh relative px-6 pt-7 pb-5">
          <AppLogo href="/" imageClassName="h-8 w-auto" />
          <h2 className="mt-4 font-serif text-[22px] font-bold leading-tight text-foreground">
            {view === "login"
              ? "Connexion"
              : isForgotPassword
                ? "Mot de passe oublié"
                : "Rejoins la communauté"}
          </h2>
          <p className="mt-1.5 text-[13px] text-foreground/52">
            {view === "login"
              ? "Connecte-toi pour retrouver tes événements favoris"
              : isForgotPassword
                ? "Reçois un lien pour choisir un nouveau mot de passe"
                : "Crée ton compte pour sauvegarder tes événements"}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />

        {/* Form */}
        <div className="px-6 pt-5 pb-6">
          {view === "login" ? (
            <LoginForm
              redirectTo={redirectTo}
              onSuccess={closeOnAuthSuccess}
              onSwitchToSignup={() => onViewChange("signup")}
              onSwitchToForgotPassword={() => onViewChange("forgot-password")}
            />
          ) : isForgotPassword ? (
            <ForgotPasswordForm onSwitchToLogin={() => onViewChange("login")} />
          ) : (
            <SignupForm
              redirectTo={redirectTo}
              onSuccess={closeOnAuthSuccess}
              onSwitchToLogin={() => onViewChange("login")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
