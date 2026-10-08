"use client";

import { useState } from "react";
import { SignupWizard } from "@/components/auth/signup-wizard";
import { AppLogo } from "@/components/layout/app-logo";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const events = [
  { id: -1, nomEvent: "Aventure des Alpes", image: null },
  { id: -2, nomEvent: "Aventure de Bretagne", image: null },
  { id: -3, nomEvent: "Aventure des Pyrénées", image: null },
];

export function OnboardingPreview() {
  const [session, setSession] = useState(0);
  const restart = () => setSession((current) => current + 1);

  return (
    <Dialog open dismissible={false}>
      <DialogContent className="gap-0 p-0 sm:max-w-[440px]" showCloseButton={false}>
        <DialogTitle className="sr-only">Test local du récit d’aventure</DialogTitle>
        <div className="hero-mesh px-6 pt-7 pb-4">
          <AppLogo href="http://www.upcomi.cc" ariaLabel="Accéder au site Upcomi" imageClassName="h-8 w-auto" />
        </div>
        <div className="min-w-0 px-6 pt-5 pb-6">
          <SignupWizard key={session} startStep="recits" previewEvents={events} onDone={restart} />
          <div className="mt-5 border-t border-foreground/10 pt-4 text-center">
            <p className="text-xs text-foreground/65">Test local · événements fictifs · aucun enregistrement en base</p>
            <button type="button" onClick={restart}
              className="mt-2 min-h-11 rounded-[var(--radius-sm)] px-3 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-coral">
              Recommencer le test
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
