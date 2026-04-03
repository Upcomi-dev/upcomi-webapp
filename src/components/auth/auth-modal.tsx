"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";
import { useAuthModal } from "./auth-modal-context";

export function AuthModal() {
  const { isOpen, view, redirectAfterAuth, closeAuthModal, setView } =
    useAuthModal();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeAuthModal();
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[400px]">
        {/* Header with gradient mesh */}
        <div className="hero-mesh relative px-6 pt-7 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="soft-ring flex h-9 w-9 items-center justify-center rounded-full bg-white/58 text-[10px] font-semibold uppercase tracking-[0.28em] text-coral shadow-[var(--shadow-sm)]">
              U
            </div>
            <span className="font-serif text-[20px] font-bold leading-none tracking-tight text-coral">
              upcomi
            </span>
          </div>
          <h2 className="mt-4 font-serif text-[22px] font-bold leading-tight text-foreground">
            {view === "login" ? "Content de te revoir" : "Rejoins la communauté"}
          </h2>
          <p className="mt-1.5 text-[13px] text-foreground/52">
            {view === "login"
              ? "Connecte-toi pour retrouver tes événements favoris"
              : "Crée ton compte pour sauvegarder tes événements"}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />

        {/* Form */}
        <div className="px-6 pt-5 pb-6">
          {view === "login" ? (
            <LoginForm
              redirectTo={redirectAfterAuth}
              onSuccess={closeAuthModal}
              onSwitchToSignup={() => setView("signup")}
            />
          ) : (
            <SignupForm
              redirectTo={redirectAfterAuth}
              onSuccess={closeAuthModal}
              onSwitchToLogin={() => setView("login")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
