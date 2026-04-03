"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { label: "Date proche", value: "date-asc" },
  { label: "Date lointaine", value: "date-desc" },
  { label: "Nom A-Z", value: "name-asc" },
];

export function SortControl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const currentSort = searchParams.get("sort");
  const currentLabel =
    SORT_OPTIONS.find((option) => option.value === currentSort)?.label || "Trier";

  const setSort = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get("sort") === value) params.delete("sort");
      else params.set("sort", value);

      const query = params.toString();
      router.push(query ? `/?${query}` : "/", { scroll: false });
      setOpen(false);
    },
    [router, searchParams]
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all",
          currentSort
            ? "border-coral/30 bg-coral text-white shadow-[var(--shadow-sm)]"
            : "border-white/55 bg-white/60 text-foreground/70 hover:border-coral/25 hover:text-coral"
        )}
      >
        <span>{currentLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-30 min-w-[220px] rounded-[24px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,251,246,0.96),rgba(248,240,230,0.94))] p-2 shadow-[var(--shadow-md)]">
          {SORT_OPTIONS.map((option) => {
            const active = currentSort === option.value;

            return (
              <button
                key={option.value}
                onClick={() => setSort(option.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[18px] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] transition-all",
                  active
                    ? "bg-coral text-white"
                    : "text-foreground/70 hover:bg-white/65 hover:text-coral"
                )}
              >
                <span>{option.label}</span>
                {active ? <span>✓</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
