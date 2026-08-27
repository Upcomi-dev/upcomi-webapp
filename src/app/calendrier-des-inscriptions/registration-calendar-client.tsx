"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  Heart,
  LayoutGrid,
  List,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatDateValue, getDateKey } from "@/lib/utils/event-dates";
import { makeLegacyEventSlug } from "@/lib/utils/slugify";
import {
  buildCalendarMonth,
  formatMonthLabel,
  formatWeekdayLabel,
  type CalendarDayCell,
  getRegistrationStatus,
  groupByRegistrationDay,
  groupByRegistrationMonth,
  REGISTRATION_STATUSES,
  type RegistrationEvent,
} from "@/lib/utils/registration-calendar";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type CalendarView = "agenda" | "liste";
type CalendarFilter = "all" | "popular" | "favorites";

interface RegistrationCalendarClientProps {
  events: RegistrationEvent[];
  popularEventIds: number[];
  todayKey: string;
}

function formatEventDate(event: RegistrationEvent): string {
  const start = formatDateValue(event.dateEvent, "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const end = formatDateValue(event.dateFin, "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (start && end && getDateKey(event.dateEvent) !== getDateKey(event.dateFin)) {
    return `${start} — ${end}`;
  }

  return start ?? "Date à confirmer";
}

function getEventHref(event: RegistrationEvent): string {
  return `/event/${event.slug || makeLegacyEventSlug(event.id, event.nomEvent)}`;
}

function getEventLocation(event: RegistrationEvent): string {
  return [event.villeDepart, event.paysDepart].filter(Boolean).join(", ") || "Lieu à confirmer";
}

export function RegistrationCalendarClient({
  events,
  popularEventIds,
  todayKey,
}: RegistrationCalendarClientProps) {
  const { user, ready } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { isFavorite } = useFavorites();
  const isLoggedIn = user !== null;

  const [view, setView] = useState<CalendarView>("agenda");
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedEvent, setSelectedEvent] = useState<RegistrationEvent | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  });

  const popularIds = useMemo(() => new Set(popularEventIds), [popularEventIds]);

  // Pas de filtre "Enregistrés" en déconnecté·e : les favoris ne sont pas
  // accessibles sans compte.
  const activeFilter = !isLoggedIn && filter === "favorites" ? "all" : filter;

  const filteredEvents = useMemo(() => {
    if (activeFilter === "popular") {
      return events.filter((event) => popularIds.has(event.id));
    }

    if (activeFilter === "favorites") {
      return events.filter((event) => isFavorite(event.id));
    }

    return events;
  }, [activeFilter, events, isFavorite, popularIds]);

  const monthGroups = useMemo(
    () => groupByRegistrationMonth(filteredEvents),
    [filteredEvents]
  );
  const eventsByDay = useMemo(
    () => groupByRegistrationDay(filteredEvents),
    [filteredEvents]
  );
  const calendarMonth = useMemo(
    () =>
      buildCalendarMonth(visibleMonth.year, visibleMonth.monthIndex, eventsByDay, todayKey),
    [eventsByDay, todayKey, visibleMonth]
  );

  const goToPreviousMonth = () => {
    setVisibleMonth(({ year, monthIndex }) =>
      monthIndex === 0
        ? { year: year - 1, monthIndex: 11 }
        : { year, monthIndex: monthIndex - 1 }
    );
  };

  const goToNextMonth = () => {
    setVisibleMonth(({ year, monthIndex }) =>
      monthIndex === 11
        ? { year: year + 1, monthIndex: 0 }
        : { year, monthIndex: monthIndex + 1 }
    );
  };

  const content =
    view === "liste" ? (
      <ListView
        monthGroups={monthGroups}
        popularIds={popularIds}
        todayKey={todayKey}
      />
    ) : (
      <CalendarView
        leadingBlanks={calendarMonth.leadingBlanks}
        days={calendarMonth.days}
        label={formatMonthLabel(visibleMonth.year, visibleMonth.monthIndex)}
        popularIds={popularIds}
        todayKey={todayKey}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onSelectEvent={setSelectedEvent}
      />
    );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Affichage du calendrier"
          className="glass inline-flex rounded-full p-1"
        >
          <ViewButton
            active={view === "agenda"}
            onClick={() => setView("agenda")}
            icon={<LayoutGrid className="h-[15px] w-[15px]" />}
            label="Calendrier"
          />
          <ViewButton
            active={view === "liste"}
            onClick={() => setView("liste")}
            icon={<List className="h-[15px] w-[15px]" />}
            label="Liste"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            active={activeFilter === "all"}
            onClick={() => setFilter("all")}
            label="Toutes les ouvertures"
          />
          <FilterChip
            active={activeFilter === "popular"}
            onClick={() => setFilter("popular")}
            icon={<Flame className="h-[13px] w-[13px]" />}
            label="Les plus populaires"
          />
          {isLoggedIn ? (
            <FilterChip
              active={activeFilter === "favorites"}
              onClick={() => setFilter("favorites")}
              icon={<Heart className="h-[13px] w-[13px]" />}
              label="Enregistrés"
            />
          ) : null}
        </div>
      </div>

      {/* Déconnecté·e : on voit le début de l'agenda, la suite est masquée
          derrière un dégradé renvoyant vers la modale de connexion. */}
      {ready && !isLoggedIn ? (
        <div className="relative max-h-[360px] overflow-hidden">
          {content}
          <div className="absolute inset-x-0 bottom-0 flex h-[220px] items-end justify-center bg-[linear-gradient(180deg,transparent,var(--background)_62%)] pb-4">
            <button
              type="button"
              onClick={() =>
                openAuthModal({ redirect: "/calendrier-des-inscriptions" })
              }
              className="inline-flex h-11 items-center justify-center rounded-full bg-coral px-6 text-[13px] font-semibold text-white shadow-[var(--shadow-md)] transition-all hover:-translate-y-0.5 hover:bg-coral-dark"
            >
              Voir l&apos;agenda des inscriptions
            </button>
          </div>
        </div>
      ) : (
        content
      )}

      <EventSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} popularIds={popularIds} todayKey={todayKey} />
    </>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-all ${
        active
          ? "bg-white text-coral shadow-[var(--shadow-sm)]"
          : "text-foreground/55 hover:text-coral"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold transition-all hover:-translate-y-0.5 ${
        active
          ? "border-coral/40 bg-coral/12 text-coral"
          : "border-white/55 bg-white/58 text-foreground/58 hover:border-coral/30 hover:text-coral"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusDot({
  event,
  popularIds,
  todayKey,
  className = "h-2.5 w-2.5",
}: {
  event: RegistrationEvent;
  popularIds: Set<number>;
  todayKey: string;
  className?: string;
}) {
  const status = getRegistrationStatus(event, popularIds.has(event.id), todayKey);
  const { label, color } = REGISTRATION_STATUSES[status];

  return (
    <span
      className={`flex-none rounded-full ${className}`}
      style={{ backgroundColor: color }}
      title={label}
      aria-label={label}
    />
  );
}

function ListView({
  monthGroups,
  popularIds,
  todayKey,
}: {
  monthGroups: ReturnType<typeof groupByRegistrationMonth>;
  popularIds: Set<number>;
  todayKey: string;
}) {
  if (monthGroups.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-7">
      {monthGroups.map((group) => (
        <section key={group.key}>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
            {group.label}
          </h2>

          <div className="space-y-2">
            {group.events.map((event) => {
              const openDateKey = getDateKey(event.dateInscription);
              const [year, month, day] = (openDateKey ?? "").split("-").map(Number);

              return (
                <Link
                  key={event.id}
                  href={getEventHref(event)}
                  className="glass flex items-center gap-3.5 rounded-[22px] border border-white/55 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-orange/40 hover:bg-white/85"
                >
                  <div className="w-11 flex-none text-center">
                    <span className="block text-[20px] font-bold leading-[1.1] text-foreground">
                      {day}
                    </span>
                    <span className="block text-[11px] uppercase text-foreground/45">
                      {formatWeekdayLabel(year, month - 1, day)}
                    </span>
                  </div>

                  <StatusDot event={event} popularIds={popularIds} todayKey={todayKey} />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold text-foreground">
                      {event.nomEvent || "Évènement"}
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-foreground/55">
                      {getEventLocation(event)} · Évènement le {formatEventDate(event)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function CalendarView({
  leadingBlanks,
  days,
  label,
  popularIds,
  todayKey,
  onPreviousMonth,
  onNextMonth,
  onSelectEvent,
}: {
  leadingBlanks: number;
  days: CalendarDayCell[];
  label: string;
  popularIds: Set<number>;
  todayKey: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectEvent: (event: RegistrationEvent) => void;
}) {
  return (
    <div className="glass rounded-[22px] border border-white/55 p-3 md:p-5">
      <div className="mb-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onPreviousMonth}
          aria-label="Mois précédent"
          className="soft-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/58 text-foreground/55 transition-all hover:-translate-y-0.5 hover:text-coral"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-[200px] text-center font-serif text-[22px] text-foreground">
          {label}
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Mois suivant"
          className="soft-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/58 text-foreground/55 transition-all hover:-translate-y-0.5 hover:text-coral"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-[3px] md:gap-1.5">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground/45 md:text-[11px]"
          >
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-[3px] md:gap-1.5">
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} aria-hidden="true" />
        ))}

        {days.map((day) => (
          <div
            key={day.dateKey}
            className="flex min-h-[72px] flex-col gap-0.5 rounded-[10px] bg-white/45 p-1 ring-1 ring-white/55 md:min-h-[92px] md:p-1.5"
          >
            <div
              className={`text-[12px] font-semibold ${
                day.isToday
                  ? "flex h-[22px] w-[22px] items-center justify-center self-center rounded-full bg-coral text-white"
                  : "text-foreground/60"
              }`}
            >
              {day.dayNumber}
            </div>

            {day.events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent(event)}
                title={event.nomEvent || "Évènement"}
                className="flex min-w-0 items-start gap-1 rounded-[6px] text-left text-[9px] leading-tight text-foreground/80 transition-colors hover:text-coral md:text-[11px]"
              >
                <StatusDot
                  event={event}
                  popularIds={popularIds}
                  todayKey={todayKey}
                  className="mt-[3px] h-1.5 w-1.5"
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {event.nomEvent || "Évènement"}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventSheet({
  event,
  onClose,
  popularIds,
  todayKey,
}: {
  event: RegistrationEvent | null;
  onClose: () => void;
  popularIds: Set<number>;
  todayKey: string;
}) {
  if (!event) return null;

  const status =
    REGISTRATION_STATUSES[
      getRegistrationStatus(event, popularIds.has(event.id), todayKey)
    ];
  const openDate = formatDateValue(event.dateInscription, "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
          <span
            className="h-2.5 w-2.5 flex-none rounded-full"
            style={{ backgroundColor: status.color }}
          />
          {status.label}
        </div>

        <DialogTitle className="font-serif text-[22px] leading-tight text-foreground">
          {event.nomEvent || "Évènement"}
        </DialogTitle>

        <p className="text-[13px] text-foreground/55">
          {getEventLocation(event)} · Évènement le {formatEventDate(event)}
        </p>

        {openDate ? (
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Calendar className="h-[15px] w-[15px] text-coral" />
            Inscriptions le {openDate}
          </p>
        ) : null}

        <Link
          href={getEventHref(event)}
          className="inline-flex h-11 items-center justify-center rounded-full bg-coral px-5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-coral-dark"
        >
          Voir l&apos;évènement →
        </Link>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-[22px] border border-white/55 px-6 py-14 text-center">
      <p className="text-[15px] font-semibold text-foreground">
        Aucune ouverture d&apos;inscription à afficher
      </p>
      <p className="mt-1 text-[13px] text-foreground/55">
        Change de filtre pour voir d&apos;autres ouvertures.
      </p>
    </div>
  );
}
