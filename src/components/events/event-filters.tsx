"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const BIKE_TYPES = ["Gravel", "VTT", "Route"];
const EVENT_TYPES = ["Course", "Aventure", "Brevet", "Social Ride", "Evènement"];
const DISTANCE_OPTIONS = [
  { label: "< 200 km", value: "Moins de 200km" },
  { label: "200-500 km", value: "Entre 200 et 500km" },
  { label: "500-1000 km", value: "Entre 500 et 1000km" },
  { label: "> 1000 km", value: "Plus de 1000km" },
];
const REGION_OPTIONS = [
  { label: "France", value: "France" },
  { label: "Etranger", value: "Etranger" },
];
type PanelKey = "bike" | "type" | "distance" | "region";

function buildParams(current: URLSearchParams, key: string, value: string, multi: boolean) {
  const params = new URLSearchParams(current.toString());
  if (multi) {
    const existing = params.get(key)?.split(",").filter(Boolean) || [];
    if (existing.includes(value)) {
      const next = existing.filter((v) => v !== value);
      if (next.length) params.set(key, next.join(","));
      else params.delete(key);
    } else {
      params.set(key, [...existing, value].join(","));
    }
  } else {
    if (params.get(key) === value) params.delete(key);
    else params.set(key, value);
  }
  return params;
}

function removeValue(current: URLSearchParams, key: string, value?: string) {
  const params = new URLSearchParams(current.toString());

  if (!value) {
    params.delete(key);
    return params;
  }

  const next = params.get(key)?.split(",").filter(Boolean).filter((item) => item !== value) || [];
  if (next.length) params.set(key, next.join(","));
  else params.delete(key);

  return params;
}

export function InlineFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);

  const updateParams = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.push(query ? `/?${query}` : "/", { scroll: false });
    },
    [router]
  );

  const toggle = useCallback(
    (key: string, value: string, multi = true) => {
      updateParams(buildParams(searchParams, key, value, multi));
    },
    [searchParams, updateParams]
  );

  const setSingle = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get(key) === value) params.delete(key);
      else params.set(key, value);
      updateParams(params);
    },
    [searchParams, updateParams]
  );

  const clearAll = useCallback(() => {
    router.push("/", { scroll: false });
  }, [router]);

  const isActive = useCallback(
    (key: string, value: string) => {
      const current = searchParams.get(key);
      if (!current) return false;
      return current.split(",").includes(value);
    },
    [searchParams]
  );

  const activeTags = useMemo(() => {
    const tags: Array<{ key: string; label: string; value?: string }> = [];

    for (const type of BIKE_TYPES) {
      if (isActive("bike_type", type)) {
        tags.push({ key: "bike_type", value: type, label: type });
      }
    }

    for (const type of EVENT_TYPES) {
      if (isActive("type_event", type)) {
        tags.push({ key: "type_event", value: type, label: type });
      }
    }

    for (const option of DISTANCE_OPTIONS) {
      if (isActive("distance", option.value)) {
        tags.push({ key: "distance", value: option.value, label: option.label });
      }
    }

    for (const option of REGION_OPTIONS) {
      if (isActive("region", option.value)) {
        tags.push({ key: "region", value: option.value, label: option.label });
      }
    }

    return tags;
  }, [isActive]);

  const counts = {
    bike: searchParams.get("bike_type")?.split(",").filter(Boolean).length || 0,
    type: searchParams.get("type_event")?.split(",").filter(Boolean).length || 0,
    distance: searchParams.get("distance")?.split(",").filter(Boolean).length || 0,
    region: searchParams.get("region") ? 1 : 0,
  };

  const hasFilters = activeTags.length > 0;

  return (
    <div className="w-full">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <ActionButton
            label="Type"
            active={openPanel === "type" || counts.type > 0}
            badge={counts.type || undefined}
            onClick={() => setOpenPanel((current) => (current === "type" ? null : "type"))}
          />
          <ActionButton
            label="Distance"
            active={openPanel === "distance" || counts.distance > 0}
            badge={counts.distance || undefined}
            onClick={() => setOpenPanel((current) => (current === "distance" ? null : "distance"))}
          />
          <ActionButton
            label="Vélo"
            active={openPanel === "bike" || counts.bike > 0}
            badge={counts.bike || undefined}
            onClick={() => setOpenPanel((current) => (current === "bike" ? null : "bike"))}
          />
          <ActionButton
            label="Zone"
            active={openPanel === "region" || counts.region > 0}
            badge={counts.region || undefined}
            onClick={() => setOpenPanel((current) => (current === "region" ? null : "region"))}
          />
          <div className="ml-auto flex items-center gap-2">
            {hasFilters && (
              <button
                onClick={clearAll}
                className="rounded-full border border-coral/20 bg-coral/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral transition-all hover:bg-coral/14"
              >
                Effacer tout
              </button>
            )}
          </div>
        </div>

        {openPanel && (
          <div className="mt-3 rounded-[28px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,251,246,0.94),rgba(248,240,230,0.9))] p-4 shadow-[var(--shadow-md)]">
            {openPanel === "type" && (
              <FilterSection label="Type d'événement">
                {EVENT_TYPES.map((type) => (
                  <FilterPill
                    key={type}
                    label={type}
                    active={isActive("type_event", type)}
                    onClick={() => toggle("type_event", type)}
                  />
                ))}
              </FilterSection>
            )}

            {openPanel === "distance" && (
              <FilterSection label="Distance">
                {DISTANCE_OPTIONS.map((option) => (
                  <FilterPill
                    key={option.value}
                    label={option.label}
                    active={isActive("distance", option.value)}
                    onClick={() => toggle("distance", option.value)}
                  />
                ))}
              </FilterSection>
            )}

            {openPanel === "bike" && (
              <FilterSection label="Type de vélo">
                {BIKE_TYPES.map((type) => (
                  <FilterPill
                    key={type}
                    label={type}
                    active={isActive("bike_type", type)}
                    onClick={() => toggle("bike_type", type)}
                  />
                ))}
              </FilterSection>
            )}

            {openPanel === "region" && (
              <FilterSection label="Zone">
                {REGION_OPTIONS.map((option) => (
                  <FilterPill
                    key={option.value}
                    label={option.label}
                    active={isActive("region", option.value)}
                    onClick={() => setSingle("region", option.value)}
                  />
                ))}
              </FilterSection>
            )}

          </div>
        )}

        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeTags.map((tag) => (
              <button
                key={`${tag.key}-${tag.value || tag.label}`}
                onClick={() => updateParams(removeValue(searchParams, tag.key, tag.value))}
                className="rounded-full border border-white/55 bg-white/62 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70 transition-all hover:border-coral/25 hover:text-coral"
              >
                {tag.label} ×
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  active,
  badge,
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all",
        active
          ? "border-coral/30 bg-coral text-white shadow-[var(--shadow-sm)]"
          : "border-white/55 bg-white/60 text-foreground/70 hover:border-coral/25 hover:text-coral"
      )}
    >
      <span>{label}</span>
      {badge ? (
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]",
            active ? "bg-white/18 text-white" : "bg-coral/10 text-coral"
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all",
        active
          ? "border-coral bg-coral text-white"
          : "border-white/55 bg-white/65 text-foreground/70 hover:border-coral/24 hover:text-coral"
      )}
    >
      {label}
    </button>
  );
}
