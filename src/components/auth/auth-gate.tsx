"use client";

import { Check } from "lucide-react";

// Reprise du gate du prototype : la même plus-value est affichée quel que soit
// le geste qui a amené là, seul le titre change. C'est le premier écran du
// parcours — on explique ce qu'on gagne avant de demander quoi que ce soit.
const GATE_BENEFITS = [
  "Enregistre les évènements qui t'intéressent et retrouve-les en un clic.",
  "Suis tes inscriptions et garde ton calendrier à jour.",
  "Crée ton profil et affiche tes participations.",
];

const DEFAULT_TITLE = "Rejoins la communauté Upcomi";

interface AuthGateProps {
  /** Le geste qui a amené là, par ex. « … pour enregistrer cet évènement ». */
  title?: string;
  onSignup: () => void;
  onLogin: () => void;
}

export function AuthGate({ title, onSignup, onLogin }: AuthGateProps) {
  return (
    <div className="space-y-5">
      <h3 className="font-serif text-[20px] font-bold leading-tight text-foreground">
        {title || DEFAULT_TITLE}
      </h3>

      <ul className="space-y-3">
        {GATE_BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2.5 text-foreground/72">
            <Check className="mt-0.5 size-4 flex-none" />
            <span className="text-[14px] leading-5">{benefit}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onSignup}
          className="w-full rounded-[var(--radius-sm)] bg-coral py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,94,65,0.35)] transition-all hover:bg-coral-dark hover:shadow-[0_6px_24px_rgba(255,94,65,0.45)]"
        >
          Créer un compte
        </button>
        <button
          type="button"
          onClick={onLogin}
          className="soft-ring w-full rounded-[var(--radius-sm)] bg-white/72 py-3 text-sm font-semibold text-foreground transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40"
        >
          Me connecter
        </button>
      </div>
    </div>
  );
}
