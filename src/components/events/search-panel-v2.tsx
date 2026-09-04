"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  MoveHorizontal,
  Search,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PastEventsToggle } from "@/components/events/past-events-toggle";
import {
  BIKE_TYPES,
  DURATION_OPTIONS,
  getUpcomingPeriods,
  ZONES,
  formatShortDate,
  getDistanceSteps,
  getUpcomingMonths,
} from "@/lib/events/search-v2";

/**
 * Recherche V2 — MAQUETTE.
 *
 * Trois axes posés dans l'ordre où la question se pose : combien de temps,
 * quelle distance, pour quand. Chacun ouvre une feuille de propositions en
 * choix multiple, validée par un bouton pleine largeur. Le reste (type, vélo,
 * zone, mixité, inscriptions ouvertes) se replie derrière « Filtres… », à
 * droite du champ de recherche libre.
 *
 * Deux choses valent qu'on s'y arrête, parce qu'elles viennent du test
 * utilisateur et pas d'un goût de designer :
 *
 * - **Le champ de recherche libre est sorti des filtres avancés.** Tant qu'il
 *   était replié dedans, aucune participante ne le trouvait.
 * - **Les trois axes passent de la ligne à la pile dès qu'on en ouvre un.**
 *   Compacts tant qu'on n'a rien touché, pleine largeur ensuite : ce qu'on est
 *   en train de choisir mérite la place, pas les trois boutons au repos.
 *
 * ------------------------------------------------------------------
 * ⚠️ Cette maquette ne filtre rien
 * ------------------------------------------------------------------
 *
 * Tout l'état est **local**. Le panneau n'écrit pas dans l'URL et la carte ne
 * réagit pas — contrairement à `InlineFilters`, qui reste dans le dépôt et
 * continue de porter la recherche en production.
 *
 * Ce n'est pas de la paresse : **les deux premiers axes n'ont pas de donnée en
 * base** (ni durée en jours, ni distance numérique — voir
 * `lib/events/search-v2`). Brancher les quatre autres critères sur l'URL et
 * laisser Durée et Distance inertes donnerait un écran où la moitié des
 * boutons marche, ce qui est plus trompeur qu'un écran qui n'en promet aucun.
 * Le branchement se fait d'un bloc, après la migration.
 */

type AxisKind = "duration" | "distance" | "dates" | "type" | "bike" | "zone";

type DateMode =
  | { type: "weekend" }
  | { type: "month"; key: string; label: string }
  | { type: "range"; id: string; label: string }
  | { type: "custom"; start: string; end: string };

const AXIS_TITLES: Record<AxisKind, string> = {
  duration: "Tu cherches un évènement qui va durer combien de temps ?",
  distance: "Tu veux rouler quelle distance ?",
  dates: "Tu cherches pour quand ?",
  type: "Quel type d'évènement ?",
  bike: "Avec quel vélo ?",
  zone: "Dans quelle zone ?",
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const DEFAULT_EVENT_TYPES = ["Course", "Aventure", "Brevet", "Ultra", "Social Ride"];

export function SearchPanelV2({
  eventTypeOptions = DEFAULT_EVENT_TYPES,
}: {
  /** Types réellement présents au catalogue ; repli sur la liste connue. */
  eventTypeOptions?: string[];
}) {
  const [durations, setDurations] = useState<string[]>([]);
  const [distanceSteps, setDistanceSteps] = useState<number[]>([]);
  const [dateModes, setDateModes] = useState<DateMode[]>([]);
  const [search, setSearch] = useState("");
  const [openAxis, setOpenAxis] = useState<AxisKind | null>(null);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [bikes, setBikes] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [mixite, setMixite] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const steps = useMemo(() => getDistanceSteps(durations), [durations]);
  const months = useMemo(() => getUpcomingMonths(), []);
  const periods = useMemo(() => getUpcomingPeriods(), []);

  // Les trois axes passent en pile dès qu'un critère est posé ou qu'une
  // feuille est ouverte — mais pas quand on tape dans le champ libre ni quand
  // on coche un filtre replié : ceux-là ne les concernent pas.
  const axesEngaged =
    openAxis !== null ||
    durations.length > 0 ||
    distanceSteps.length > 0 ||
    dateModes.length > 0;

  const advancedCount =
    types.length + bikes.length + zones.length + (mixite ? 1 : 0) + (registrationOpen ? 1 : 0);

  const hasInteracted = axesEngaged || search.length > 0 || advancedCount > 0;

  const durationLabel =
    durations.length === 0
      ? "Durée"
      : DURATION_OPTIONS.filter((option) => durations.includes(option.id))
          .map((option) => option.label)
          .join(", ");

  const distanceLabel =
    distanceSteps.length === 0
      ? "Distance"
      : [...distanceSteps]
          .sort((a, b) => a - b)
          .map((index) => steps[index]?.label)
          .filter(Boolean)
          .join(", ");

  const dateLabel =
    dateModes.length === 0
      ? "Dates"
      : dateModes
          .map((mode) =>
            mode.type === "weekend"
              ? "Ce week-end"
              : mode.type === "custom"
                ? `${formatShortDate(mode.start)} – ${formatShortDate(mode.end)}`
                : mode.label
          )
          .join(", ");

  const closeSheet = () => {
    setOpenAxis(null);
    setCustomOpen(false);
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          "gap-2.5",
          axesEngaged ? "flex flex-col" : "flex flex-col sm:flex-row sm:items-stretch"
        )}
      >
        <AxisButton
          icon={Clock}
          label={durationLabel}
          active={durations.length > 0}
          open={openAxis === "duration"}
          onClick={() => setOpenAxis("duration")}
        />
        <AxisButton
          icon={MoveHorizontal}
          label={distanceLabel}
          active={distanceSteps.length > 0}
          open={openAxis === "distance"}
          onClick={() => setOpenAxis("distance")}
        />
        <AxisButton
          icon={CalendarDays}
          label={dateLabel}
          active={dateModes.length > 0}
          open={openAxis === "dates"}
          onClick={() => setOpenAxis("dates")}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom, lieu, organisation…"
            aria-label="Rechercher un évènement"
            className="w-full rounded-full border border-white/55 bg-white/70 py-3 pl-11 pr-10 text-sm text-foreground outline-none transition-all placeholder:text-foreground/35 focus:border-coral/35 focus:bg-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Effacer la recherche"
              className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-foreground/8 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="inline-flex h-[46px] flex-none items-center gap-1.5 rounded-full border border-white/55 bg-white/70 px-4 text-[13px] font-semibold text-foreground/65 transition-all hover:border-coral/30 hover:text-coral"
        >
          Filtres…
          {advancedCount > 0 && (
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[11px] font-bold leading-none text-white">
              {advancedCount}
            </span>
          )}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", advancedOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </div>

      {advancedOpen && (
        <div className="mt-3 rounded-[24px] border border-white/55 bg-white/45 p-3.5">
          <div className="flex flex-wrap gap-2">
            <Chip
              label="Type"
              count={types.length}
              active={types.length > 0}
              onClick={() => setOpenAxis("type")}
            />
            <Chip
              label="Vélo"
              count={bikes.length}
              active={bikes.length > 0}
              onClick={() => setOpenAxis("bike")}
            />
            <Chip
              label="Zone"
              count={zones.length}
              active={zones.length > 0}
              onClick={() => setOpenAxis("zone")}
            />
            <Chip
              label="Inscriptions ouvertes"
              active={registrationOpen}
              onClick={() => setRegistrationOpen((value) => !value)}
            />
            <Chip
              label="Mixité choisie"
              active={mixite}
              onClick={() => setMixite((value) => !value)}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <PastEventsToggle
              active={showPast}
              onToggle={() => setShowPast((value) => !value)}
              label="Afficher les évènements passés"
              className="bg-white/64 px-4 py-3 text-left normal-case tracking-normal"
            />
          </div>
        </div>
      )}

      {/* Tout en bas, sous les filtres actifs : la dernière action de la
          recherche, pas une étape intermédiaire. Apparaît au premier geste,
          quel qu'il soit. */}
      {hasInteracted && (
        <button type="button" className="btn-primary mt-3 w-full">
          <Search className="h-4 w-4" aria-hidden="true" />
          Rechercher
        </button>
      )}

      <Dialog open={openAxis !== null} onOpenChange={(open) => !open && closeSheet()}>
        <DialogContent
          showCloseButton={false}
          className="top-auto bottom-0 left-0 right-0 max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-b-none rounded-t-[32px] border-x-0 border-b-0 bg-[linear-gradient(180deg,rgba(255,251,246,0.99),rgba(247,239,229,0.98))] p-5 pb-6 data-open:slide-in-from-bottom data-closed:slide-out-to-bottom sm:left-1/2 sm:right-auto sm:max-w-lg sm:-translate-x-1/2"
        >
          <DialogTitle className="mb-4 pr-8 font-serif text-[20px] leading-snug text-foreground">
            {openAxis ? AXIS_TITLES[openAxis] : ""}
          </DialogTitle>
          <button
            type="button"
            onClick={closeSheet}
            aria-label="Fermer"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-foreground/55 transition-colors hover:bg-white hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {openAxis === "duration" && (
            <PillSelect>
              {DURATION_OPTIONS.map((option) => (
                <Pill
                  key={option.id}
                  label={option.label}
                  active={durations.includes(option.id)}
                  onClick={() => {
                    setDurations((current) => toggle(current, option.id));
                    // Les paliers changent avec la durée : garder une sélection
                    // faite sur l'ancien jeu afficherait un libellé qui ne
                    // correspond plus à rien.
                    setDistanceSteps([]);
                  }}
                />
              ))}
            </PillSelect>
          )}

          {openAxis === "distance" && (
            <>
              {durations.length !== 1 && (
                <p className="mb-3 text-[13px] text-foreground/55">
                  Choisis d&apos;abord une durée pour des distances plus pertinentes.
                </p>
              )}
              <PillSelect>
                {steps.map((step, index) => (
                  <Pill
                    key={step.label}
                    label={step.label}
                    active={index === 0 ? distanceSteps.length === 0 : distanceSteps.includes(index)}
                    onClick={() => {
                      // Le premier palier est « Toutes distances » : le choisir
                      // ne s'ajoute pas aux autres, il les efface.
                      if (index === 0) setDistanceSteps([]);
                      else setDistanceSteps((current) => toggle(current, index));
                    }}
                  />
                ))}
              </PillSelect>
            </>
          )}

          {openAxis === "dates" && (
            <>
              <PillSelect>
                <Pill
                  label="Ce week-end"
                  active={dateModes.some((mode) => mode.type === "weekend")}
                  onClick={() =>
                    setDateModes((current) =>
                      current.some((mode) => mode.type === "weekend")
                        ? current.filter((mode) => mode.type !== "weekend")
                        : [...current, { type: "weekend" }]
                    )
                  }
                />
                {months.map((month) => (
                  <Pill
                    key={month.key}
                    label={month.label}
                    active={dateModes.some(
                      (mode) => mode.type === "month" && mode.key === month.key
                    )}
                    onClick={() =>
                      setDateModes((current) =>
                        current.some((mode) => mode.type === "month" && mode.key === month.key)
                          ? current.filter(
                              (mode) => !(mode.type === "month" && mode.key === month.key)
                            )
                          : [...current, { type: "month", key: month.key, label: month.label }]
                      )
                    }
                  />
                ))}
                {periods.map((period) => (
                  <Pill
                    key={period.id}
                    label={period.label}
                    active={dateModes.some(
                      (mode) => mode.type === "range" && mode.id === period.id
                    )}
                    onClick={() =>
                      setDateModes((current) =>
                        current.some((mode) => mode.type === "range" && mode.id === period.id)
                          ? current.filter(
                              (mode) => !(mode.type === "range" && mode.id === period.id)
                            )
                          : [...current, { type: "range", id: period.id, label: period.label }]
                      )
                    }
                  />
                ))}
                {/* « Personnalisé » est une proposition comme les autres : elle
                    ouvre les deux champs au lieu de choisir directement. */}
                <Pill
                  label={
                    dateModes.find((mode) => mode.type === "custom")
                      ? `Personnalisé : ${customStart && formatShortDate(customStart)} – ${customEnd && formatShortDate(customEnd)}`
                      : "Personnalisé"
                  }
                  active={customOpen || dateModes.some((mode) => mode.type === "custom")}
                  onClick={() => {
                    if (dateModes.some((mode) => mode.type === "custom")) {
                      setDateModes((current) => current.filter((mode) => mode.type !== "custom"));
                      setCustomOpen(false);
                      return;
                    }
                    setCustomOpen((open) => !open);
                  }}
                />
              </PillSelect>

              {customOpen && (
                <div className="mt-3 flex flex-wrap items-end gap-3 rounded-[20px] border border-white/60 bg-white/60 p-3.5">
                  <label className="flex flex-col gap-1 text-[12px] font-semibold text-foreground/55">
                    Du
                    <input
                      type="date"
                      value={customStart}
                      onChange={(event) => setCustomStart(event.target.value)}
                      className="rounded-[14px] border border-white/60 bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-coral/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[12px] font-semibold text-foreground/55">
                    Au
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(event) => setCustomEnd(event.target.value)}
                      className="rounded-[14px] border border-white/60 bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-coral/40"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!customStart || !customEnd}
                    onClick={() => {
                      setDateModes((current) => [
                        ...current.filter((mode) => mode.type !== "custom"),
                        { type: "custom", start: customStart, end: customEnd },
                      ]);
                      setCustomOpen(false);
                    }}
                    className="btn-primary btn-small"
                  >
                    Appliquer
                  </button>
                </div>
              )}
            </>
          )}

          {openAxis === "type" && (
            <PillSelect>
              {eventTypeOptions.map((option) => (
                <Pill
                  key={option}
                  label={option}
                  active={types.includes(option)}
                  onClick={() => setTypes((current) => toggle(current, option))}
                />
              ))}
            </PillSelect>
          )}

          {openAxis === "bike" && (
            <PillSelect>
              {BIKE_TYPES.map((option) => (
                <Pill
                  key={option}
                  label={option}
                  active={bikes.includes(option)}
                  onClick={() => setBikes((current) => toggle(current, option))}
                />
              ))}
            </PillSelect>
          )}

          {openAxis === "zone" && (
            <PillSelect>
              {ZONES.map((option) => (
                <Pill
                  key={option}
                  label={option}
                  active={zones.includes(option)}
                  onClick={() => setZones((current) => toggle(current, option))}
                />
              ))}
            </PillSelect>
          )}

          {/* Les propositions restent ouvertes après un clic : on peut en
              cocher plusieurs, c'est « Valider » qui referme. */}
          <button type="button" onClick={closeSheet} className="btn-primary mt-5 w-full">
            Valider
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AxisButton({
  icon: Icon,
  label,
  active,
  open,
  onClick,
}: {
  icon: typeof Clock;
  label: string;
  active: boolean;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[46px] flex-1 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-all",
        active || open
          ? "border-coral/45 bg-coral/12 text-coral"
          : "border-white/55 bg-white/70 text-foreground/65 hover:border-coral/30 hover:text-coral"
      )}
    >
      <Icon className="h-4 w-4 flex-none" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition-all",
        active
          ? "border-coral/45 bg-coral/12 font-semibold text-coral"
          : "border-white/55 bg-white/70 text-foreground/65 hover:border-coral/30 hover:text-coral"
      )}
    >
      {label}
      {count ? <span className="font-bold">({count})</span> : null}
    </button>
  );
}

function PillSelect({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Pill({
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
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[38px] items-center rounded-full border px-4 text-[13px] transition-all",
        active
          ? "border-coral bg-coral/14 font-semibold text-coral"
          : "border-white/60 bg-white/75 text-foreground/70 hover:border-coral/35 hover:text-coral"
      )}
    >
      {label}
    </button>
  );
}
