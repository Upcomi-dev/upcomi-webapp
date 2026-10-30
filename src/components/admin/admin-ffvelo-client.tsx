"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Download,
  ExternalLink,
  FileImage,
  Mail,
  MapPin,
  Search,
  X,
} from "lucide-react";
import type { FfveloCircuit, FfveloEvent, FfveloPractice } from "@/lib/ffvelo";

const PAGE_SIZE = 60;
const PRACTICES: FfveloPractice[] = ["Route", "VTT", "Gravel", "Marche"];
const PRACTICE_STYLES: Record<FfveloPractice, string> = {
  Route: "bg-coral/10 text-coral-dark",
  VTT: "bg-green/12 text-green-dark",
  Gravel: "bg-orange/12 text-orange-dark",
  Marche: "bg-violet/10 text-violet-dark",
};
const DIFFICULTY = ["", "Facile", "Moyen", "Difficile", "Très difficile"];
const PERIODS = [
  { id: "all", label: "Tout", days: null },
  { id: "7", label: "7 jours", days: 7 },
  { id: "30", label: "30 jours", days: 30 },
  { id: "90", label: "3 mois", days: 90 },
] as const;
const MIN_DISTANCES = [0, 50, 100, 200, 300];
const OPTIONS = [
  { id: "onlineRegistration", label: "Inscription en ligne" },
  { id: "openToAll", label: "Ouvert aux non-licenciés" },
  { id: "gpx", label: "Trace GPX" },
  { id: "women", label: "Spécial féminines" },
  { id: "accessible", label: "Accès PSH" },
  { id: "longDistance", label: "Longue distance" },
] as const;
const SORTS = [
  { id: "date", label: "Date" },
  { id: "created", label: "Ajoutées récemment" },
  { id: "distance", label: "Distance max" },
  { id: "name", label: "Nom" },
] as const;

type OptionId = (typeof OPTIONS)[number]["id"];
type SortId = (typeof SORTS)[number]["id"];
type PeriodId = (typeof PERIODS)[number]["id"];

const OPTION_TESTS: Record<OptionId, (event: FfveloEvent) => boolean> = {
  onlineRegistration: (event) => event.onlineRegistration,
  openToAll: (event) => !event.licensedOnly,
  gpx: (event) => event.gpx.length > 0,
  women: (event) => event.women,
  accessible: (event) => event.accessible,
  longDistance: (event) => event.longDistance,
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function addDays(isoDay: string, days: number) {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDay(isoDay: string, options: Intl.DateTimeFormatOptions) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return isoDay || "Date inconnue";
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", ...options });
}

const maxDistance = (event: FfveloEvent) =>
  Math.max(0, ...Object.values(event.practices).flatMap((list) => list.map((circuit) => circuit.distance)));

function distanceRange(circuits: FfveloCircuit[]) {
  if (!circuits.length) return "";
  const min = circuits[0].distance;
  const max = circuits[circuits.length - 1].distance;
  return min === max ? `${min} km` : `${min}–${max} km`;
}

const sortedUnique = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));

export function AdminFfveloClient({ events, today }: { events: FfveloEvent[]; today: string }) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<PeriodId>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [region, setRegion] = useState("");
  const [department, setDepartment] = useState("");
  const [type, setType] = useState("");
  const [practices, setPractices] = useState<Set<FfveloPractice>>(new Set());
  const [options, setOptions] = useState<Set<OptionId>>(new Set());
  const [minDistance, setMinDistance] = useState(0);
  const [sort, setSort] = useState<SortId>("date");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<string | null>(null);

  const regions = useMemo(() => sortedUnique(events.map((event) => event.region)), [events]);
  const departments = useMemo(
    () => sortedUnique(events.filter((event) => !region || event.region === region).map((event) => event.department)),
    [events, region],
  );
  // "Brevets / 200 Km / Randonneur" → famille "Brevets"
  const typeGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const value of sortedUnique(events.map((event) => event.type))) {
      const family = value.split(" / ")[0];
      groups.set(family, [...(groups.get(family) ?? []), value]);
    }
    return [...groups];
  }, [events]);

  const searchIndex = useMemo(
    () =>
      new Map(
        events.map((event) => [
          event.id,
          normalize([event.name, event.city, event.zip, event.club, event.place, event.department].join(" ")),
        ]),
      ),
    [events],
  );

  const range = useMemo(() => {
    const preset = PERIODS.find((item) => item.id === period);
    if (preset?.days) return { from: today, to: addDays(today, preset.days) };
    return { from: dateFrom, to: dateTo };
  }, [period, today, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    const result = events.filter((event) => {
      if (needle && !searchIndex.get(event.id)?.includes(needle)) return false;
      if (range.from && event.startDate < range.from) return false;
      if (range.to && event.startDate > range.to) return false;
      if (region && event.region !== region) return false;
      if (department && event.department !== department) return false;
      if (type && event.type !== type) return false;
      if (practices.size && ![...practices].some((practice) => event.practices[practice])) return false;
      for (const option of options) if (!OPTION_TESTS[option](event)) return false;
      if (minDistance && maxDistance(event) < minDistance) return false;
      return true;
    });

    const byDate = (a: FfveloEvent, b: FfveloEvent) => a.startDate.localeCompare(b.startDate);
    const compare: Record<SortId, (a: FfveloEvent, b: FfveloEvent) => number> = {
      date: (a, b) => byDate(a, b) || a.name.localeCompare(b.name, "fr"),
      created: (a, b) => b.createdAt.localeCompare(a.createdAt) || byDate(a, b),
      distance: (a, b) => maxDistance(b) - maxDistance(a) || byDate(a, b),
      name: (a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }),
    };
    return result.sort(compare[sort]);
  }, [events, searchIndex, query, range, region, department, type, practices, options, minDistance, sort]);

  const shown = filtered.slice(0, limit);
  // Regroupement par jour seulement quand la liste est triée par date.
  const groups = useMemo(() => {
    if (sort !== "date") return [{ key: "all", label: "", items: shown }];
    const map = new Map<string, FfveloEvent[]>();
    for (const event of shown) map.set(event.startDate, [...(map.get(event.startDate) ?? []), event]);
    return [...map].map(([day, items]) => ({
      key: day,
      label: formatDay(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      items,
    }));
  }, [shown, sort]);

  const activeCount =
    (query ? 1 : 0) +
    (period !== "all" || dateFrom || dateTo ? 1 : 0) +
    (region ? 1 : 0) +
    (department ? 1 : 0) +
    (type ? 1 : 0) +
    practices.size +
    options.size +
    (minDistance ? 1 : 0);

  // Toute modification des filtres repart du haut de la liste.
  const update =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setLimit(PAGE_SIZE);
      setExpanded(null);
    };

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const reset = () => {
    setQuery("");
    setPeriod("all");
    setDateFrom("");
    setDateTo("");
    setRegion("");
    setDepartment("");
    setType("");
    setPractices(new Set());
    setOptions(new Set());
    setMinDistance(0);
    setLimit(PAGE_SIZE);
    setExpanded(null);
  };

  const fieldClass =
    "h-10 w-full rounded-[14px] border border-foreground/10 bg-white px-3 text-[14px] text-foreground focus-visible:outline-2 focus-visible:outline-coral";
  const labelClass = "flex min-w-0 flex-col gap-1.5 text-[12px] font-medium text-foreground/60";
  const chipClass = (active: boolean) =>
    `inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-coral ${
      active
        ? "border-foreground bg-foreground text-white"
        : "border-foreground/12 bg-white text-foreground/70 hover:border-foreground/30"
    }`;

  return (
    <div className="space-y-5">
      <section
        aria-label="Filtres"
        className="space-y-4 rounded-[28px] border border-white/60 bg-white/72 p-5 shadow-[var(--shadow-sm)]"
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => update(setQuery)(e.target.value)}
            placeholder="Nom, commune, code postal, club…"
            aria-label="Rechercher une manifestation"
            className={`${fieldClass} h-11 pl-10`}
          />
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[12px] font-medium text-foreground/60">Période</legend>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={period === item.id}
                  onClick={() => update(setPeriod)(item.id)}
                  className={chipClass(period === item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          {period === "all" && (
            <div className="flex gap-3">
              <label className={labelClass}>
                Du
                <input
                  type="date"
                  value={dateFrom}
                  min={today}
                  onChange={(e) => update(setDateFrom)(e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Au
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || today}
                  onChange={(e) => update(setDateTo)(e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>
            Région
            <select
              value={region}
              onChange={(e) => {
                update(setRegion)(e.target.value);
                setDepartment("");
              }}
              className={fieldClass}
            >
              <option value="">Toutes</option>
              {regions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Département
            <select
              value={department}
              onChange={(e) => update(setDepartment)(e.target.value)}
              className={fieldClass}
            >
              <option value="">Tous</option>
              {departments.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Type
            <select value={type} onChange={(e) => update(setType)(e.target.value)} className={fieldClass}>
              <option value="">Tous</option>
              {typeGroups.map(([family, values]) => (
                <optgroup key={family} label={family}>
                  {values.map((value) => (
                    <option key={value} value={value}>
                      {value.split(" / ").slice(1).join(" / ") || value}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Plus long circuit
            <select
              value={minDistance}
              onChange={(e) => update(setMinDistance)(Number(e.target.value))}
              className={fieldClass}
            >
              {MIN_DISTANCES.map((value) => (
                <option key={value} value={value}>
                  {value ? `${value} km et plus` : "Toutes distances"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <fieldset>
            <legend className="mb-1.5 text-[12px] font-medium text-foreground/60">Pratique</legend>
            <div className="flex flex-wrap gap-2">
              {PRACTICES.map((practice) => (
                <button
                  key={practice}
                  type="button"
                  aria-pressed={practices.has(practice)}
                  onClick={() => update(setPractices)(toggle(practices, practice))}
                  className={chipClass(practices.has(practice))}
                >
                  {practice}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-[12px] font-medium text-foreground/60">Critères</legend>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={options.has(option.id)}
                  onClick={() => update(setOptions)(toggle(options, option.id))}
                  className={chipClass(options.has(option.id))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-foreground/70" aria-live="polite">
          <span className="font-semibold tabular-nums text-foreground">{filtered.length}</span>
          {filtered.length === events.length ? " manifestations" : ` sur ${events.length} manifestations`}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={reset}
              className="ml-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-semibold text-coral hover:bg-coral/10"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Réinitialiser ({activeCount})
            </button>
          )}
        </p>
        <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-foreground/60">
          Trier par
          <select
            value={sort}
            onChange={(e) => update(setSort)(e.target.value as SortId)}
            className={`${fieldClass} h-9 w-auto`}
          >
            {SORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[28px] border border-white/60 bg-white/72 px-6 py-12 text-center shadow-[var(--shadow-sm)]">
          <p className="text-[15px] font-semibold text-foreground">Aucune manifestation ne correspond.</p>
          <button type="button" onClick={reset} className="mt-3 text-[14px] font-semibold text-coral hover:underline">
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label || undefined}>
              {group.label && (
                <h3 className="sticky top-0 z-10 -mx-1 mb-2 bg-background/90 px-1 py-2 text-[13px] font-semibold text-foreground/70 first-letter:uppercase backdrop-blur">
                  {group.label}
                  <span className="ml-2 font-normal tabular-nums text-foreground/40">{group.items.length}</span>
                </h3>
              )}
              <ul className="overflow-hidden rounded-[24px] border border-white/60 bg-white/80 shadow-[var(--shadow-sm)]">
                {group.items.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    today={today}
                    showDate={sort !== "date"}
                    open={expanded === event.id}
                    onToggle={() => setExpanded(expanded === event.id ? null : event.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
          {filtered.length > shown.length && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setLimit(limit + PAGE_SIZE)}
                className="rounded-full border border-foreground/12 bg-white px-5 py-2.5 text-[13px] font-semibold text-foreground/70 transition-colors hover:bg-foreground/5"
              >
                Afficher plus ({filtered.length - shown.length} restantes)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventRow({
  event,
  today,
  showDate,
  open,
  onToggle,
}: {
  event: FfveloEvent;
  today: string;
  showDate: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const isNew = event.createdAt >= addDays(today, -7);
  const multiDay = event.endDate && event.endDate !== event.startDate;
  const detailId = `ffvelo-${event.id}`;
  const entries = Object.entries(event.practices) as [FfveloPractice, FfveloCircuit[]][];

  return (
    <li className="border-b border-foreground/6 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={detailId}
        className={`grid w-full gap-x-6 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-coral/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-coral md:grid-cols-[minmax(0,1fr)_13rem_17rem] md:items-center ${
          open ? "bg-coral/[0.04]" : ""
        }`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold leading-snug text-foreground">{event.name}</span>
            {isNew && (
              <span className="rounded-full bg-green/15 px-2 py-0.5 text-[11px] font-semibold text-green-dark">
                Nouveau
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[13px] text-foreground/55">
            {showDate && (
              <span className="font-medium text-foreground/75">
                {formatDay(event.startDate, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
              </span>
            )}
            {event.type}
            {event.club && ` · ${event.club}`}
          </p>
        </div>

        <div className="min-w-0 text-[13px] text-foreground/70">
          <p className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-foreground/40" aria-hidden="true" />
            <span className="truncate">
              {event.city} <span className="text-foreground/45">{event.zip}</span>
            </span>
          </p>
          <p className="mt-0.5 truncate pl-5 text-[12px] text-foreground/45">
            {event.hours}
            {multiDay && ` · jusqu'au ${formatDay(event.endDate, { day: "numeric", month: "short" })}`}
          </p>
        </div>

        <div className="flex items-center gap-3 md:justify-end">
          <div className="flex flex-wrap gap-1.5">
            {entries.map(([practice, circuits]) => (
              <span
                key={practice}
                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums ${PRACTICE_STYLES[practice]}`}
              >
                {practice}
                {circuits.length > 0 && <span className="font-normal"> {distanceRange(circuits)}</span>}
              </span>
            ))}
          </div>
          <ChevronDown
            className={`ml-auto h-4 w-4 shrink-0 text-foreground/40 transition-transform md:ml-0 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {open && <EventDetail id={detailId} event={event} entries={entries} />}
    </li>
  );
}

function EventDetail({
  id,
  event,
  entries,
}: {
  id: string;
  event: FfveloEvent;
  entries: [FfveloPractice, FfveloCircuit[]][];
}) {
  const mapsUrl =
    event.lat !== null && event.lng !== null
      ? `https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`
      : "";
  const prices = [
    ["Licencié adulte", event.prices.licAdult],
    ["Licencié jeune", event.prices.licYoung],
    ["Non-licencié adulte", event.licensedOnly ? "Réservé aux licenciés" : event.prices.nonLicAdult],
    ["Non-licencié jeune", event.licensedOnly ? "—" : event.prices.nonLicYoung],
  ];
  const badges = [
    event.licensedOnly && "Réservé aux licenciés",
    event.women && "Spécial féminines",
    event.accessible && "Accès PSH",
    event.longDistance && "Label longue distance",
    event.sustainable && "Développement durable",
  ].filter(Boolean) as string[];
  const linkClass =
    "inline-flex h-9 items-center gap-1.5 rounded-full border border-foreground/12 bg-white px-3.5 text-[13px] font-medium text-foreground/75 transition-colors hover:bg-foreground/5";

  return (
    <div id={id} className="grid gap-6 bg-coral/[0.03] px-5 pb-5 pt-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        {entries.some(([, circuits]) => circuits.length > 0) && (
          <div>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/45">Circuits</h4>
            <div className="overflow-x-auto rounded-[16px] border border-foreground/8 bg-white">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-foreground/8 text-left text-[12px] text-foreground/50">
                    <th scope="col" className="px-3 py-2 font-medium">Pratique</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Distance</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Dénivelé</th>
                    <th scope="col" className="px-3 py-2 font-medium">Difficulté</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {entries.flatMap(([practice, circuits]) =>
                    circuits.map((circuit, index) => (
                      <tr key={`${practice}-${index}`} className="border-b border-foreground/5 last:border-b-0">
                        <td className="px-3 py-1.5 text-foreground/75">{practice}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-foreground">{circuit.distance} km</td>
                        <td className="px-3 py-1.5 text-right text-foreground/70">
                          {circuit.elevation ? `${circuit.elevation} m` : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-foreground/70">{DIFFICULTY[circuit.difficulty] || "—"}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {event.notes && (
          <div>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
              Observations
            </h4>
            <p className="whitespace-pre-line text-[14px] leading-6 text-foreground/80">{event.notes}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {event.registrationUrl && (
            <a href={event.registrationUrl} target="_blank" rel="noreferrer" className={linkClass}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Inscription
            </a>
          )}
          {event.website && (
            <a href={event.website} target="_blank" rel="noreferrer" className={linkClass}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Site du club
            </a>
          )}
          {event.flyer && (
            <a href={event.flyer} target="_blank" rel="noreferrer" className={linkClass}>
              <FileImage className="h-3.5 w-3.5" aria-hidden="true" />
              Flyer
            </a>
          )}
          {event.gpx.map((url, index) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className={linkClass}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              GPX{event.gpx.length > 1 ? ` ${index + 1}` : ""}
            </a>
          ))}
        </div>
      </div>

      <dl className="grid content-start gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
        <Info label="Accueil">
          {[event.place, event.address, `${event.zip} ${event.city}`.trim()].filter(Boolean).join(", ")}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="ml-1 font-medium text-coral hover:underline">
              Carte
            </a>
          )}
        </Info>
        <Info label="Horaires">
          {event.hours}
          {event.closingTime && ` · clôture ${event.closingTime}`}
        </Info>
        <Info label="Club">{event.club}</Info>
        <Info label="Département">
          {event.department}
          {event.region && ` · ${event.region}`}
        </Info>
        <Info label="Contact">
          {event.contactName}
          {event.contactEmail && (
            <a
              href={`mailto:${event.contactEmail}`}
              className="mt-0.5 flex items-center gap-1 break-all text-coral hover:underline"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {event.contactEmail}
            </a>
          )}
        </Info>
        <Info label="Tarifs">
          <ul className="space-y-0.5">
            {prices.map(([name, value]) => (
              <li key={name} className="flex justify-between gap-3">
                <span className="text-foreground/55">{name}</span>
                <span className="tabular-nums text-foreground/85">{value || "—"}</span>
              </li>
            ))}
          </ul>
        </Info>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:col-span-2">
            {badges.map((badge) => (
              <span key={badge} className="rounded-full bg-foreground/6 px-2.5 py-1 text-[12px] text-foreground/70">
                {badge}
              </span>
            ))}
          </div>
        )}
        <p className="text-[12px] text-foreground/40 sm:col-span-2">
          FFVélo n° {event.id}
          {event.createdAt && ` · ajoutée le ${formatDay(event.createdAt, { day: "numeric", month: "long", year: "numeric" })}`}
        </p>
      </dl>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/45">{label}</dt>
      <dd className="mt-1 break-words text-foreground/85">{children || "—"}</dd>
    </div>
  );
}
