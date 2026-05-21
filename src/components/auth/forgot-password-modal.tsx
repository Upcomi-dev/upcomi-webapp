"use client";

import { AppLogo } from "@/components/layout/app-logo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ForgotPasswordForm } from "./forgot-password-form";

export function ForgotPasswordModal() {
  return (
    <Dialog open>
      <DialogContent
        className="gap-0 p-0 sm:max-w-[400px]"
        showCloseButton={false}
      >
        <div className="hero-mesh relative px-6 pt-7 pb-5">
          <AppLogo href="/" imageClassName="h-8 w-auto" />
          <h2 className="mt-4 font-serif text-[22px] font-bold leading-tight text-foreground">
            Mot de passe oublié
          </h2>
          <p className="mt-1.5 text-[13px] text-foreground/52">
            Reçois un lien pour choisir un nouveau mot de passe
          </p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />

        <div className="px-6 pt-5 pb-6">
          <ForgotPasswordForm />
        </div>
      </DialogContent>
    </Dialog>
  );
}
