"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarDays, Info } from "lucide-react";
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
type PanelKey = "bike" | "type" | "distance" | "region" | "date";

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

interface InlineFiltersProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function InlineFilters({ searchValue = "", onSearchChange }: InlineFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";

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

  const setValue = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextValue = value.trim();

      if (nextValue) params.set(key, nextValue);
      else params.delete(key);

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

    if (dateFrom) {
      tags.push({ key: "date_from", label: `À partir du ${formatDateLabel(dateFrom)}` });
    }

    if (dateTo) {
      tags.push({ key: "date_to", label: `Jusqu'au ${formatDateLabel(dateTo)}` });
    }

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

    if (searchParams.get("mint") === "true") {
      tags.push({ key: "mint", label: "Mixité choisie" });
    }

    return tags;
  }, [dateFrom, dateTo, isActive]);

  const counts = {
    date: Number(Boolean(dateFrom)) + Number(Boolean(dateTo)),
    bike: searchParams.get("bike_type")?.split(",").filter(Boolean).length || 0,
    type: searchParams.get("type_event")?.split(",").filter(Boolean).length || 0,
    distance: searchParams.get("distance")?.split(",").filter(Boolean).length || 0,
    region: searchParams.get("region") ? 1 : 0,
  };

  const hasFilters = activeTags.length > 0;

  return (
    <div className="w-full">
      <div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
              Recherche
            </span>
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Nom, lieu, organisateur..."
              className="w-full rounded-[18px] border border-white/55 bg-white/70 px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-foreground/35 focus:border-coral/35 focus:bg-white"
            />
          </label>

          <ActionButton
            label={getDateButtonLabel(dateFrom, dateTo)}
            active={openPanel === "date" || counts.date > 0}
            badge={counts.date || undefined}
            icon={CalendarDays}
            onClick={() => setOpenPanel((current) => (current === "date" ? null : "date"))}
          />
        </div>

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
          <ActionButton
            label="Mixité choisie"
            active={searchParams.get("mint") === "true"}
            onClick={() => setSingle("mint", "true")}
            tooltip="Événements non-mixtes, entre femmes et minorités de genre"
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
            {openPanel === "date" && (
              <FilterSection label="Période">
                <DateRangeCalendar
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onChange={(nextFrom, nextTo) => {
                    const params = new URLSearchParams(searchParams.toString());

                    if (nextFrom) params.set("date_from", nextFrom);
                    else params.delete("date_from");

                    if (nextTo) params.set("date_to", nextTo);
                    else params.delete("date_to");

                    updateParams(params);
                  }}
                />
              </FilterSection>
            )}

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
  icon: Icon,
  tooltip,
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: number;
  icon?: React.ComponentType<{ className?: string }>;
  tooltip?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group/btn relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all",
        active
          ? "border-coral/30 bg-coral text-white shadow-[var(--shadow-sm)]"
          : "border-white/55 bg-white/60 text-foreground/70 hover:border-coral/25 hover:text-coral"
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{label}</span>
      {tooltip && (
        <>
          <Info className={cn("h-3.5 w-3.5", active ? "text-white/60" : "text-foreground/30")} />
          <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-56 rounded-xl bg-foreground/90 px-3 py-2 text-xs font-normal normal-case tracking-normal leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover/btn:opacity-100">
            {tooltip}
          </span>
        </>
      )}
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

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDateButtonLabel(dateFrom: string, dateTo: string) {
  if (dateFrom && dateTo) {
    return `${formatDateLabel(dateFrom)} - ${formatDateLabel(dateTo)}`;
  }

  if (dateFrom) {
    return `Après ${formatDateLabel(dateFrom)}`;
  }

  if (dateTo) {
    return `Avant ${formatDateLabel(dateTo)}`;
  }

  return "Dates";
}

function DateRangeCalendar({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
}) {
  const selectedStart = parseDateValue(dateFrom);
  const selectedEnd = parseDateValue(dateTo);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selectedStart ?? selectedEnd ?? new Date())
  );

  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  const handleDayClick = useCallback(
    (day: Date) => {
      const clicked = formatDateValue(day);

      if (!selectedStart || (selectedStart && selectedEnd)) {
        onChange(clicked, "");
        return;
      }

      if (isSameDay(day, selectedStart)) {
        onChange("", "");
        return;
      }

      if (day < selectedStart) {
        onChange(clicked, formatDateValue(selectedStart));
        return;
      }

      onChange(dateFrom, clicked);
    },
    [dateFrom, onChange, selectedEnd, selectedStart]
  );

  return (
    <div className="w-full rounded-[24px] border border-white/55 bg-white/45 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
          className="rounded-full border border-white/55 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70 transition-all hover:border-coral/25 hover:text-coral"
        >
          Prec
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">
            {visibleMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-foreground/45">
            {getDateRangeSummary(dateFrom, dateTo)}
          </div>
        </div>
        <button
          onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
          className="rounded-full border border-white/55 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70 transition-all hover:border-coral/25 hover:text-coral"
        >
          Suiv
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => {
            const { start, end } = getWeekendRange(new Date());
            onChange(formatDateValue(start), formatDateValue(end));
            setVisibleMonth(startOfMonth(start));
          }}
          className="rounded-full border border-white/55 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70 transition-all hover:border-coral/25 hover:text-coral"
        >
          Ce week-end
        </button>
        <button
          onClick={() => {
            const { start, end } = getSevenDayRange(new Date());
            onChange(formatDateValue(start), formatDateValue(end));
            setVisibleMonth(startOfMonth(start));
          }}
          className="rounded-full border border-white/55 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70 transition-all hover:border-coral/25 hover:text-coral"
        >
          Cette semaine
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/38"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelectedStart = selectedStart ? isSameDay(day, selectedStart) : false;
          const isSelectedEnd = selectedEnd ? isSameDay(day, selectedEnd) : false;
          const isInRange =
            selectedStart && selectedEnd ? day > selectedStart && day < selectedEnd : false;
          const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                "rounded-[16px] px-0 py-3 text-sm transition-all",
                isSelectedStart || isSelectedEnd
                  ? "bg-coral font-semibold text-white"
                  : isInRange
                    ? "bg-coral/14 text-coral"
                    : isCurrentMonth
                      ? "bg-white/72 text-foreground hover:border-coral/25 hover:text-coral"
                      : "bg-white/30 text-foreground/32 hover:text-foreground/55"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/45">
          1 clic = debut, 2e clic = fin
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => onChange("", "")}
            className="rounded-full border border-coral/20 bg-coral/8 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-coral transition-all hover:bg-coral/14"
          >
            Effacer
          </button>
        )}
      </div>
    </div>
  );
}

function parseDateValue(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const next = new Date(date);
  next.setDate(date.getDate() + diff);
  return next;
}

function buildCalendarDays(month: Date) {
  const first = startOfWeek(startOfMonth(month));
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first);
    day.setDate(first.getDate() + index);
    return day;
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDateRangeSummary(dateFrom: string, dateTo: string) {
  if (dateFrom && dateTo) {
    return `${formatDateLabel(dateFrom)} -> ${formatDateLabel(dateTo)}`;
  }

  if (dateFrom) {
    return `Debut ${formatDateLabel(dateFrom)}`;
  }

  if (dateTo) {
    return `Fin ${formatDateLabel(dateTo)}`;
  }

  return "Choisir une plage";
}

function getWeekendRange(referenceDate: Date) {
  const start = stripTime(referenceDate);
  const day = start.getDay();
  const daysUntilSaturday = day === 0 ? 6 : 6 - day;

  start.setDate(start.getDate() + daysUntilSaturday);

  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return { start, end };
}

function getSevenDayRange(referenceDate: Date) {
  const start = stripTime(referenceDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
