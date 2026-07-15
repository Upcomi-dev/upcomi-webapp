"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildEventTypeOptions, DEFAULT_EVENT_TYPES } from "@/lib/events/filter-options";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PastEventsToggle } from "./past-events-toggle";

const BIKE_TYPES = ["Gravel", "VTT", "Route"];
const DISTANCE_OPTIONS = [
  { label: "< 200 km", value: "Moins de 200km" },
  { label: "200-500 km", value: "Entre 200 et 500km" },
  { label: "500-1000 km", value: "Entre 500 et 1000km" },
  { label: "> 1000 km", value: "Plus de 1000km" },
];
const REGION_OPTIONS = [
  { label: "France", value: "France" },
  { label: "Étranger", value: "Etranger" },
];
const MINT_FILTER_DESCRIPTION = "Événements non-mixtes, entre femmes et minorités de genre";
type PanelKey = "bike" | "type" | "distance" | "region" | "date" | "mint";
type DatePreset = { label: string; dateFrom: string; dateTo: string; start: Date };

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

function removeDateRange(current: URLSearchParams) {
  const params = new URLSearchParams(current.toString());
  params.delete("date_from");
  params.delete("date_to");
  return params;
}

function countActiveFilters(params: URLSearchParams) {
  const keys = ["bike_type", "type_event", "distance", "region", "budget", "mint", "show_past"];
  const count = keys.reduce((total, key) => {
    const value = params.get(key);
    if (!value) return total;
    return total + value.split(",").filter(Boolean).length;
  }, 0);
  return count + Number(Boolean(params.get("date_from") || params.get("date_to")));
}

interface InlineFiltersProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  expandAllPanels?: boolean;
  variant?: "default" | "drawer";
  eventTypeOptions?: readonly string[];
}

export function InlineFilters({
  searchValue = "",
  onSearchChange,
  showSearch = true,
  expandAllPanels = false,
  variant = "default",
  eventTypeOptions = DEFAULT_EVENT_TYPES,
}: InlineFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputId = useId();
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const showPastEvents = searchParams.get("show_past") === "true";
  const datePresets = useMemo(() => getDatePresets(new Date()), []);
  const selectedEventTypes = useMemo(
    () => searchParams.get("type_event")?.split(",").filter(Boolean) ?? [],
    [searchParams]
  );
  const resolvedEventTypes = useMemo(
    () => buildEventTypeOptions([...eventTypeOptions, ...selectedEventTypes]),
    [eventTypeOptions, selectedEventTypes]
  );

  const updateParams = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.push(query ? `/?${query}` : "/", { scroll: false });
    },
    [router]
  );

  const isActive = useCallback(
    (key: string, value: string) => {
      const current = searchParams.get(key);
      if (!current) return false;
      return current.split(",").includes(value);
    },
    [searchParams]
  );

  const toggle = useCallback(
    (key: string, value: string, multi = true) => {
      const wasActive = isActive(key, value);
      const nextParams = buildParams(searchParams, key, value, multi);
      updateParams(nextParams);
      trackAnalyticsEvent("Filter Changed", {
        filter_key: key,
        filter_value: value,
        action: wasActive ? "removed" : "added",
        active_filter_count: countActiveFilters(nextParams),
        surface: variant,
      });
    },
    [isActive, searchParams, updateParams, variant]
  );

  const setSingle = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const wasActive = params.get(key) === value;
      if (wasActive) params.delete(key);
      else params.set(key, value);
      updateParams(params);
      trackAnalyticsEvent("Filter Changed", {
        filter_key: key,
        filter_value: value,
        action: wasActive ? "removed" : "added",
        active_filter_count: countActiveFilters(params),
        surface: variant,
      });
    },
    [searchParams, updateParams, variant]
  );

  const setDateRange = useCallback(
    (nextFrom: string, nextTo: string, filterValue?: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextFrom) params.set("date_from", nextFrom);
      else params.delete("date_from");

      if (nextTo) params.set("date_to", nextTo);
      else params.delete("date_to");

      updateParams(params);
      trackAnalyticsEvent("Filter Changed", {
        filter_key: "date",
        filter_value: filterValue,
        action: nextFrom || nextTo ? "added" : "removed",
        active_filter_count: countActiveFilters(params),
        surface: variant,
      });
    },
    [searchParams, updateParams, variant]
  );

  const toggleDatePreset = useCallback(
    (preset: DatePreset) => {
      if (isDatePresetActive(dateFrom, dateTo, preset)) {
        setDateRange("", "", preset.label);
        return;
      }

      setDateRange(preset.dateFrom, preset.dateTo, preset.label);
    },
    [dateFrom, dateTo, setDateRange]
  );

  const togglePastEvents = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("show_past") === "true") {
      params.delete("show_past");
    } else {
      params.set("show_past", "true");
    }

    updateParams(params);
    trackAnalyticsEvent("Past Events Toggled", {
      enabled: params.get("show_past") === "true",
      active_filter_count: countActiveFilters(params),
      surface: variant,
    });
  }, [searchParams, updateParams, variant]);

  const clearAll = useCallback(() => {
    onSearchChange?.("");
    router.push("/", { scroll: false });
    trackAnalyticsEvent("Filters Cleared", {
      active_filter_count: countActiveFilters(searchParams),
      surface: variant,
    });
  }, [onSearchChange, router, searchParams, variant]);

  const activeTags = useMemo(() => {
    const tags: Array<{ key: string; label: string; value?: string }> = [];

    if (dateFrom && dateTo) {
      const presetLabel = getActiveDatePresetLabel(dateFrom, dateTo, datePresets);
      tags.push({
        key: "date",
        label: presetLabel ?? (dateFrom === dateTo
          ? `Le ${formatDateLabel(dateFrom)}`
          : `Du ${formatDateLabel(dateFrom)} au ${formatDateLabel(dateTo)}`),
      });
    } else if (dateFrom) {
      tags.push({ key: "date_from", label: `À partir du ${formatDateLabel(dateFrom)}` });
    } else if (dateTo) {
      tags.push({ key: "date_to", label: `Jusqu'au ${formatDateLabel(dateTo)}` });
    }

    for (const type of BIKE_TYPES) {
      if (isActive("bike_type", type)) {
        tags.push({ key: "bike_type", value: type, label: type });
      }
    }

    for (const type of resolvedEventTypes) {
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
  }, [dateFrom, datePresets, dateTo, isActive, resolvedEventTypes, searchParams]);

  const dateFilterCount = Number(Boolean(dateFrom || dateTo));

  const counts = {
    date: dateFilterCount,
    bike: searchParams.get("bike_type")?.split(",").filter(Boolean).length || 0,
    type: searchParams.get("type_event")?.split(",").filter(Boolean).length || 0,
    distance: searchParams.get("distance")?.split(",").filter(Boolean).length || 0,
    region: searchParams.get("region") ? 1 : 0,
    mint: searchParams.get("mint") === "true" ? 1 : 0,
    past: showPastEvents ? 1 : 0,
  };

  const hasFilters = activeTags.length > 0;
  const isDrawerVariant = variant === "drawer";
  const showDatePanel = isDrawerVariant && expandAllPanels;
  const showTypePanel = expandAllPanels || openPanel === "type";
  const showDistancePanel = expandAllPanels || openPanel === "distance";
  const showBikePanel = expandAllPanels || openPanel === "bike";
  const showRegionPanel = expandAllPanels || openPanel === "region";
  const showMintPanel = expandAllPanels || openPanel === "mint";

  return (
    <div className="w-full">
      <div>
        <div className="mb-3">
          {showSearch ? (
            <div className="block">
              <label
                htmlFor={searchInputId}
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42"
              >
                Recherche
              </label>
              <div className="relative">
                <input
                  id={searchInputId}
                  type="text"
                  value={searchValue}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  placeholder="Nom, lieu, organisateur..."
                  className="w-full rounded-[18px] border border-white/55 bg-white/70 px-5 py-3 pr-12 text-sm text-foreground outline-none transition-all placeholder:text-foreground/35 focus:border-coral/35 focus:bg-white"
                />
                {searchValue ? (
                  <button
                    type="button"
                    aria-label="Effacer la recherche"
                    onClick={() => onSearchChange?.("")}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-foreground/8 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral/45"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {!isDrawerVariant ? (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <ActionButton
                label={getDateButtonLabel(dateFrom, dateTo)}
                active={dateModalOpen || counts.date > 0}
                badge={counts.date || undefined}
                icon={CalendarDays}
                onClick={() => setDateModalOpen(true)}
              />
              {datePresets.map((preset) => (
                <ActionButton
                  key={preset.label}
                  label={preset.label}
                  active={isDatePresetActive(dateFrom, dateTo, preset)}
                  className="px-3 tracking-[0.12em]"
                  onClick={() => toggleDatePreset(preset)}
                />
              ))}
            </div>

            <div aria-hidden="true" className="h-px w-1/2 bg-foreground/8" />

            <div className="flex flex-wrap items-center gap-2.5">
              <ActionButton
                label="Type"
                active={showTypePanel || counts.type > 0}
                badge={counts.type || undefined}
                onClick={() => {
                  if (expandAllPanels) return;
                  setOpenPanel((current) => (current === "type" ? null : "type"));
                }}
              />
              <ActionButton
                label="Distance"
                active={showDistancePanel || counts.distance > 0}
                badge={counts.distance || undefined}
                onClick={() => {
                  if (expandAllPanels) return;
                  setOpenPanel((current) => (current === "distance" ? null : "distance"));
                }}
              />
              <ActionButton
                label="Vélo"
                active={showBikePanel || counts.bike > 0}
                badge={counts.bike || undefined}
                onClick={() => {
                  if (expandAllPanels) return;
                  setOpenPanel((current) => (current === "bike" ? null : "bike"));
                }}
              />
              <ActionButton
                label="Zone"
                active={showRegionPanel || counts.region > 0}
                badge={counts.region || undefined}
                onClick={() => {
                  if (expandAllPanels) return;
                  setOpenPanel((current) => (current === "region" ? null : "region"));
                }}
              />
              <ActionButton
                label="Mixité choisie"
                active={counts.mint > 0}
                onClick={() => setSingle("mint", "true")}
                tooltip={MINT_FILTER_DESCRIPTION}
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
          </div>
        ) : null}

        {!isDrawerVariant ? (
          <div className="mt-3 flex justify-end">
            <PastEventsToggle
              active={showPastEvents}
              onToggle={togglePastEvents}
              label="Afficher les évènements passés"
              className="bg-white/64 px-4 py-3 text-left normal-case tracking-normal"
            />
          </div>
        ) : null}

        {(expandAllPanels || openPanel) && (
          <div className={cn(
            "mt-3",
            isDrawerVariant
              ? "space-y-5"
              : "rounded-[28px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,251,246,0.94),rgba(248,240,230,0.9))] p-4 shadow-[var(--shadow-md)]"
          )}>
            {showDatePanel && (
              <FilterSection label="Dates" variant={variant}>
                {datePresets.map((preset) => (
                  <FilterPill
                    key={preset.label}
                    label={preset.label}
                    active={isDatePresetActive(dateFrom, dateTo, preset)}
                    variant={variant}
                    onClick={() => toggleDatePreset(preset)}
                  />
                ))}
                <DateSelectionButton
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onClick={() => setDateModalOpen(true)}
                />
              </FilterSection>
            )}

            {showTypePanel && (
              <FilterSection label="Type d'événement" variant={variant}>
                {resolvedEventTypes.map((type) => (
                  <FilterPill
                    key={type}
                    label={type}
                    active={isActive("type_event", type)}
                    variant={variant}
                    onClick={() => toggle("type_event", type)}
                  />
                ))}
              </FilterSection>
            )}

            {showMintPanel && (
              <FilterSection label="Mixité choisie" variant={variant}>
                <FilterPill
                  label="Mixité choisie"
                  active={counts.mint > 0}
                  variant={variant}
                  onClick={() => setSingle("mint", "true")}
                />
                {isDrawerVariant ? (
                  <p className="flex basis-full items-start gap-1.5 text-xs leading-snug text-foreground/48">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-coral" />
                    {MINT_FILTER_DESCRIPTION}
                  </p>
                ) : null}
              </FilterSection>
            )}

            {showDistancePanel && (
              <FilterSection label="Distance" variant={variant}>
                {DISTANCE_OPTIONS.map((option) => (
                  <FilterPill
                    key={option.value}
                    label={option.label}
                    active={isActive("distance", option.value)}
                    variant={variant}
                    onClick={() => toggle("distance", option.value)}
                  />
                ))}
              </FilterSection>
            )}

            {showBikePanel && (
              <FilterSection label="Type de vélo" variant={variant}>
                {BIKE_TYPES.map((type) => (
                  <FilterPill
                    key={type}
                    label={type}
                    active={isActive("bike_type", type)}
                    variant={variant}
                    onClick={() => toggle("bike_type", type)}
                  />
                ))}
              </FilterSection>
            )}

            {showRegionPanel && (
              <FilterSection label="Région" variant={variant}>
                {REGION_OPTIONS.map((option) => (
                  <FilterPill
                    key={option.value}
                    label={option.label}
                    active={isActive("region", option.value)}
                    variant={variant}
                    onClick={() => setSingle("region", option.value)}
                  />
                ))}
              </FilterSection>
            )}

            {isDrawerVariant ? (
              <PastEventsToggle
                active={showPastEvents}
                onToggle={togglePastEvents}
                label="Afficher les évènements passés"
                className="w-full bg-white/64 px-4 py-3 text-left normal-case tracking-normal"
              />
            ) : null}
          </div>
        )}

        {hasFilters && !isDrawerVariant && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeTags.map((tag) => (
              <button
                key={`${tag.key}-${tag.value || tag.label}`}
                onClick={() => {
                  const params = tag.key === "date"
                    ? removeDateRange(searchParams)
                    : removeValue(searchParams, tag.key, tag.value);
                  updateParams(params);
                  trackAnalyticsEvent("Filter Changed", {
                    filter_key: tag.key,
                    filter_value: tag.value,
                    action: "removed",
                    active_filter_count: countActiveFilters(params),
                    surface: variant,
                  });
                }}
                className="rounded-full border border-white/55 bg-white/62 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70 transition-all hover:border-coral/25 hover:text-coral"
              >
                {tag.label} ×
              </button>
            ))}
          </div>
        )}
      </div>

      {dateModalOpen ? (
        <DateFilterDialog
          open={dateModalOpen}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onOpenChange={setDateModalOpen}
          onConfirm={setDateRange}
        />
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  active,
  badge,
  icon: Icon,
  tooltip,
  className,
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: number;
  icon?: React.ComponentType<{ className?: string }>;
  tooltip?: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group/btn relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all",
        active
          ? "border-coral/30 bg-coral text-white shadow-[var(--shadow-sm)]"
          : "border-white/55 bg-white/60 text-foreground/70 hover:border-coral/25 hover:text-coral",
        className
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
  variant = "default",
}: {
  label: string;
  children: React.ReactNode;
  variant?: "default" | "drawer";
}) {
  return (
    <section
      className={cn(
        variant === "drawer"
          ? "border-b border-white/45 pb-5 last:mb-0 last:border-b-0 last:pb-0"
          : "mb-5 last:mb-0"
      )}
    >
      <p
        className={cn(
          variant === "drawer"
            ? "mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42"
            : "mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42"
        )}
      >
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
  variant = "default",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: "default" | "drawer";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-2 text-[11px] font-semibold transition-all",
        variant === "drawer"
          ? active
            ? "border-coral bg-coral text-white"
            : "border-white/55 bg-white/65 text-foreground/70 hover:border-coral/24 hover:text-coral"
          : active
            ? "border-coral bg-coral text-white"
            : "border-white/55 bg-white/65 text-foreground/70 hover:border-coral/24 hover:text-coral",
        variant === "drawer" ? "uppercase tracking-[0.14em]" : "uppercase tracking-[0.14em]"
      )}
    >
      {label}
    </button>
  );
}

function DateSelectionButton({
  dateFrom,
  dateTo,
  onClick,
}: {
  dateFrom: string;
  dateTo: string;
  onClick: () => void;
}) {
  const hasDate = Boolean(dateFrom || dateTo);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left text-sm shadow-[var(--shadow-xs)] transition-all",
        hasDate
          ? "border-coral/25 bg-coral/8 text-coral"
          : "border-white/55 bg-white/70 text-foreground/58 hover:border-coral/24 hover:text-coral"
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <CalendarDays className="h-4 w-4 flex-none" />
        <span className="truncate font-semibold">
          {getDateButtonLabel(dateFrom, dateTo)}
        </span>
      </span>
      <span className="flex-none text-[11px] font-semibold uppercase tracking-[0.14em]">
        Modifier
      </span>
    </button>
  );
}

function DateFilterDialog({
  open,
  dateFrom,
  dateTo,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  dateFrom: string;
  dateTo: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dateFrom: string, dateTo: string) => void;
}) {
  const [draftFrom, setDraftFrom] = useState(dateFrom);
  const [draftTo, setDraftTo] = useState(dateTo);
  const canConfirm = Boolean(draftFrom || draftTo);

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return;

    const nextFrom = draftFrom || draftTo;
    const nextTo = draftTo || draftFrom;
    onConfirm(nextFrom, nextTo);
    onOpenChange(false);
  }, [canConfirm, draftFrom, draftTo, onConfirm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] gap-0 rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,251,246,0.98),rgba(248,240,230,0.96))] p-0 shadow-[0_28px_90px_rgba(40,24,11,0.2)] sm:max-w-[31rem]"
        overlayClassName="bg-[rgba(36,23,15,0.34)] supports-backdrop-filter:backdrop-blur-md"
      >
        <DialogHeader className="border-b border-white/50 px-5 pb-4 pt-5">
          <DialogTitle className="font-serif text-[26px] font-normal leading-tight text-foreground">
            Dates
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-foreground/58">
            Sélectionne une date ou une période.
          </DialogDescription>
        </DialogHeader>

        <div className="px-3 py-4 sm:px-5">
          <DateRangeCalendar
            dateFrom={draftFrom}
            dateTo={draftTo}
            onChange={(nextFrom, nextTo) => {
              setDraftFrom(nextFrom);
              setDraftTo(nextTo);
            }}
          />
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-white/50 bg-white/78 px-4 py-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setDraftFrom("");
              setDraftTo("");
            }}
            className="rounded-full border border-white/65 bg-white/80 px-4 py-3 text-[13px] font-semibold text-foreground/68 shadow-[var(--shadow-xs)] transition-all hover:text-coral"
          >
            Effacer
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 rounded-full bg-coral px-5 py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(235,95,59,0.28)] transition-all hover:bg-coral/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral/45 disabled:cursor-not-allowed disabled:bg-foreground/18 disabled:text-foreground/38 disabled:shadow-none disabled:hover:bg-foreground/18"
          >
            Confirmer
          </button>
        </div>
      </DialogContent>
    </Dialog>
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
  if (dateFrom && dateTo && dateFrom === dateTo) {
    return `Le ${formatDateLabel(dateFrom)}`;
  }

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
  const today = new Date();
  const datePresets = useMemo(() => getDatePresets(new Date()), []);

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
          type="button"
          aria-label="Mois précédent"
          onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/55 bg-white/70 text-foreground/70 transition-all hover:border-coral/25 hover:text-coral"
        >
          <ChevronLeft className="h-4 w-4" />
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
          type="button"
          aria-label="Mois suivant"
          onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/55 bg-white/70 text-foreground/70 transition-all hover:border-coral/25 hover:text-coral"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {datePresets.map((preset) => (
          <button
            type="button"
            key={preset.label}
            onClick={() => {
              onChange(preset.dateFrom, preset.dateTo);
              setVisibleMonth(startOfMonth(preset.start));
            }}
            className={cn(
              "rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all",
              isDatePresetActive(dateFrom, dateTo, preset)
                ? "border-coral bg-coral text-white"
                : "border-white/55 bg-white/70 text-foreground/70 hover:border-coral/25 hover:text-coral"
            )}
          >
            {preset.label}
          </button>
        ))}
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
          const isToday = isSameDay(day, today);

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "rounded-[16px] px-0 py-3 text-sm transition-all",
                isSelectedStart || isSelectedEnd
                  ? "bg-coral font-semibold text-white"
                  : isInRange
                    ? "bg-coral/14 text-coral"
                    : isCurrentMonth
                      ? "bg-white/72 text-foreground hover:border-coral/25 hover:text-coral"
                      : "bg-white/30 text-foreground/32 hover:text-foreground/55",
                isToday && "ring-2 ring-coral ring-inset"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {(dateFrom || dateTo) && (
          <button
            type="button"
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
  const presetLabel = getActiveDatePresetLabel(dateFrom, dateTo, getDatePresets(new Date()));
  if (presetLabel) return presetLabel;

  if (dateFrom && dateTo && dateFrom === dateTo) {
    return `Le ${formatDateLabel(dateFrom)}`;
  }

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

function getDatePresets(referenceDate: Date): DatePreset[] {
  const weekend = getWeekendRange(referenceDate);
  const week = getSevenDayRange(referenceDate);

  return [
    {
      label: "Ce week-end",
      dateFrom: formatDateValue(weekend.start),
      dateTo: formatDateValue(weekend.end),
      start: weekend.start,
    },
    {
      label: "Cette semaine",
      dateFrom: formatDateValue(week.start),
      dateTo: formatDateValue(week.end),
      start: week.start,
    },
  ];
}

function isDatePresetActive(dateFrom: string, dateTo: string, preset: DatePreset) {
  return dateFrom === preset.dateFrom && dateTo === preset.dateTo;
}

function getActiveDatePresetLabel(dateFrom: string, dateTo: string, presets: DatePreset[]) {
  return presets.find((preset) => isDatePresetActive(dateFrom, dateTo, preset))?.label;
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
