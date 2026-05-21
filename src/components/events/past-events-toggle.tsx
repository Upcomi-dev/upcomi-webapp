"use client";

import { cn } from "@/lib/utils";

interface PastEventsToggleProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
  compact?: boolean;
  label?: string;
}

export function PastEventsToggle({
  active,
  onToggle,
  className,
  compact = false,
  label = "Terminés",
}: PastEventsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "inline-flex flex-none items-center justify-between gap-3 rounded-full border text-[11px] font-semibold uppercase tracking-[0.14em] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral/45",
        compact ? "min-h-10 px-3" : "min-h-11 px-4",
        active
          ? "border-coral/35 bg-white/88 text-foreground shadow-[0_10px_22px_rgba(235,95,59,0.16)]"
          : "border-white/60 bg-white/78 text-foreground/62 shadow-[var(--shadow-xs)] hover:bg-white hover:text-foreground/80",
        className
      )}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-5 w-9 flex-none items-center rounded-full p-0.5 transition-colors",
          active ? "bg-coral" : "bg-foreground/16"
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 rounded-full bg-white shadow-[0_1px_4px_rgba(36,23,15,0.24)] transition-transform",
            active ? "translate-x-4" : "translate-x-0"
          )}
        />
      </span>
    </button>
  );
}
