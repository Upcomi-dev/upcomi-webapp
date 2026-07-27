"use client";

import { useState, useTransition } from "react";
import { setEventProposalFeatureEnabled } from "@/app/admin/actions";

export function AdminProposalFeatureToggle({ enabled }: { enabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(nextEnabled: boolean) {
    setIsEnabled(nextEnabled);
    startTransition(async () => {
      try {
        await setEventProposalFeatureEnabled(nextEnabled);
      } catch {
        setIsEnabled(!nextEnabled);
      }
    });
  }

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[24px] border border-white/60 bg-white/70 p-5 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
          Feature
        </p>
        <h3 className="mt-1 font-serif text-[22px] text-foreground">
          Proposition d’événements
        </h3>
        <p className="mt-1 text-[13px] leading-5 text-foreground/55">
          Affiche le bouton « Proposer un événement » dans le header public.
        </p>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-foreground/50">
          {isEnabled ? "Activée" : "Désactivée"}
        </span>
        <input
          type="checkbox"
          className="peer sr-only"
          checked={isEnabled}
          disabled={isPending}
          onChange={(event) => handleChange(event.target.checked)}
        />
        <span className="relative h-7 w-12 rounded-full bg-foreground/15 transition-colors peer-checked:bg-coral peer-disabled:opacity-50 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
      </label>
    </div>
  );
}
