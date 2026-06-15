"use client";

import { useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, Check, Heart } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { FavouriteButton } from "@/components/events/favourite-button";
import { getEventTypeColor } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import {
  formatDateValue,
  getDateKey,
  getLocalDateKey,
  isEventPast,
} from "@/lib/utils/event-dates";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getAppStorageImageUrl } from "@/lib/storage/urls";
import { buildRelativeUrl, withReturnTo } from "@/lib/utils/navigation";
import { makeEventSlug } from "@/lib/utils/slugify";
import { getPastFavoriteEvents, PAST_FAVORITES_PAGE_SIZE } from "@/lib/utils/favorites";
import { type FavoriteEvent, useFavorites } from "./favorites-context";

interface FavoritesPanelBodyProps {
  onNavigate?: () => void;
  onEventOpen?: (event: FavoriteEvent) => void;
  className?: string;
}

export function FavoritesPanelBody({
  onNavigate,
  onEventOpen,
  className,
}: FavoritesPanelBodyProps) {
  const {
    allFavoriteEvents,
    favoriteEvents,
    allParticipationEvents,
    participationEvents,
    toggleParticipation,
  } = useFavorites();
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"favorites" | "participations">("favorites");
  const [pastVisibleCount, setPastVisibleCount] = useState(PAST_FAVORITES_PAGE_SIZE);
  const isAuthenticated = user !== null;
  const returnTo = buildRelativeUrl(pathname, searchParams.toString());
  const activeAllEvents =
    activeTab === "favorites" ? allFavoriteEvents : allParticipationEvents;
  const activeVisibleEvents =
    activeTab === "favorites" ? favoriteEvents : participationEvents;
  const activePastEvents = useMemo(
    () => getPastFavoriteEvents(activeAllEvents),
    [activeAllEvents]
  );
  const visiblePastEvents = activePastEvents.slice(0, pastVisibleCount);
  const hasMorePastEvents = visiblePastEvents.length < activePastEvents.length;
  const title = activeTab === "favorites" ? "Mes favoris" : "Mes participations";

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="px-6 pb-4 pt-2 md:px-7 md:pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/38">
          Mon compte
        </p>
        <div className="mt-2 flex min-w-0 items-center gap-3">
          <h2 className="min-w-0 truncate font-serif text-[30px] font-bold leading-none text-foreground md:text-[34px]">
            {title}
          </h2>
        </div>

        {isAuthenticated ? (
          <div className="mt-5 grid h-[50px] grid-cols-2 rounded-full bg-foreground/[0.055] p-1">
            <TabButton
              active={activeTab === "favorites"}
              count={favoriteEvents.length}
              icon={<Heart className="h-[15px] w-[15px]" />}
              label="Mes favoris"
              onClick={() => {
                setActiveTab("favorites");
                setPastVisibleCount(PAST_FAVORITES_PAGE_SIZE);
              }}
            />
            <TabButton
              active={activeTab === "participations"}
              count={participationEvents.length}
              icon={<Check className="h-[15px] w-[15px]" />}
              label="Mes participations"
              onClick={() => {
                setActiveTab("participations");
                setPastVisibleCount(PAST_FAVORITES_PAGE_SIZE);
              }}
            />
          </div>
        ) : null}
      </div>

      {!isAuthenticated ? (
        <div className="px-6 py-10 text-center md:px-7">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-coral/10 text-coral">
            <Heart className="h-4 w-4" />
          </div>
          <p className="text-[14px] font-medium text-foreground">
            Connecte-toi pour voir tes favoris
          </p>
          <p className="mt-1 text-[12px] text-foreground/42">
            Sauvegarde les événements qui te plaisent
          </p>
        </div>
      ) : (
        <>
          {activeAllEvents.length === 0 ? (
            <EmptyState activeTab={activeTab} />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-5 md:px-7">
              {activeVisibleEvents.length > 0 ? (
                <p className="pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
                  À venir · {activeVisibleEvents.length} événement{activeVisibleEvents.length > 1 ? "s" : ""}
                </p>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-[13px] font-medium text-foreground/56">
                    Aucun {activeTab === "favorites" ? "favori" : "événement"} à venir
                  </p>
                </div>
              )}

              <div className="divide-y divide-foreground/[0.08]">
                {activeVisibleEvents.map((event) => (
                  <FavoritePanelEventRow
                    key={event.id}
                    event={event}
                    activeTab={activeTab}
                    onEventOpen={onEventOpen}
                    onNavigate={onNavigate}
                    returnTo={returnTo}
                    toggleParticipation={toggleParticipation}
                  />
                ))}
              </div>

              {activePastEvents.length > 0 ? (
                <section className="mt-5">
                  <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
                    Terminés · {activePastEvents.length} événement{activePastEvents.length > 1 ? "s" : ""}
                  </div>

                  <div className="divide-y divide-foreground/[0.08]">
                    {visiblePastEvents.map((event) => (
                      <FavoritePanelEventRow
                        key={event.id}
                        event={event}
                        activeTab={activeTab}
                        onEventOpen={onEventOpen}
                        onNavigate={onNavigate}
                        returnTo={returnTo}
                        toggleParticipation={toggleParticipation}
                      />
                    ))}
                  </div>

                  {hasMorePastEvents ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPastVisibleCount((value) => value + PAST_FAVORITES_PAGE_SIZE)
                      }
                      className="mt-3 flex h-10 w-full items-center justify-center rounded-full border border-foreground/10 bg-white/64 text-[13px] font-semibold text-foreground transition-colors hover:bg-white"
                    >
                      Voir plus
                    </button>
                  ) : null}
                </section>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FavoritePanelEventRow({
  event,
  activeTab,
  onEventOpen,
  onNavigate,
  returnTo,
  toggleParticipation,
}: {
  event: FavoriteEvent;
  activeTab: "favorites" | "participations";
  onEventOpen?: (event: FavoriteEvent) => void;
  onNavigate?: () => void;
  returnTo: string;
  toggleParticipation: (eventId: number) => Promise<boolean>;
}) {
  const typeColor = getEventTypeColor(event.type_event);
  const eventSlug = makeEventSlug(event.id, event.nomEvent);
  const eventHref = withReturnTo(`/event/${eventSlug}`, returnTo);
  const past = isEventPast(event);
  const handleEventClick = (clickEvent: MouseEvent<HTMLAnchorElement>) => {
    if (!onEventOpen) return;
    clickEvent.preventDefault();
    onEventOpen(event);
  };

  return (
    <div className="group flex items-center gap-3 py-3.5">
      <Link
        href={eventHref}
        onNavigate={onNavigate}
        onClick={handleEventClick}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <EventThumb event={event} typeColor={typeColor} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight text-foreground">
            {event.nomEvent || "Événement"}
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] text-foreground/42">
            {event.dateEvent ? (
              <span className="whitespace-nowrap">
                {formatDateValue(event.dateEvent, "fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            ) : null}
            {event.dateEvent && event.villeDepart ? (
              <span className="text-coral/40">·</span>
            ) : null}
            {event.villeDepart ? (
              <span className="truncate">{event.villeDepart}</span>
            ) : null}
            {past ? (
              <>
                <span className="text-coral/40">·</span>
                <span className="rounded-full bg-foreground/8 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-foreground/48">
                  Terminé
                </span>
              </>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex flex-none items-center gap-2">
        {activeTab === "participations" ? (
          <DatePill event={event} />
        ) : (
          <>
            <FavouriteButton eventId={event.id} />
            <ParticipationButton
              active={event.participates}
              onClick={async () => {
                const nextParticipates = await toggleParticipation(event.id);
                trackAnalyticsEvent("Participation Toggled", {
                  event_id: event.id,
                  action: nextParticipates ? "added" : "removed",
                });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  count,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-2 text-[12px] font-semibold transition-all md:text-[13px]",
        active
          ? "bg-white text-coral shadow-[0_9px_24px_rgba(36,23,15,0.08)]"
          : "text-foreground/42 hover:text-foreground/62"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "flex h-5 min-w-5 flex-none items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none",
          active
            ? "bg-coral/10 text-coral"
            : "bg-foreground/[0.075] text-foreground/42"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function EventThumb({
  event,
  typeColor,
}: {
  event: FavoriteEvent;
  typeColor: string;
}) {
  const eventImage = getAppStorageImageUrl(event.image);

  return (
    <div className="relative h-[58px] w-[58px] flex-none overflow-hidden rounded-[15px]">
      {eventImage ? (
        <Image
          src={eventImage}
          alt={event.nomEvent || "Event"}
          fill
          className="object-cover"
          sizes="58px"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${typeColor}, ${typeColor}bb)`,
          }}
        >
          <span className="text-[16px] font-semibold text-white">
            {event.nomEvent?.substring(0, 2).toUpperCase() || "EV"}
          </span>
        </div>
      )}
      {event.participates ? (
        <span className="absolute bottom-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white bg-coral text-white">
          <Check className="h-3 w-3" />
        </span>
      ) : null}
    </div>
  );
}

function ParticipationButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Retirer des participations" : "J'y participe"}
      title={active ? "Retirer des participations" : "J'y participe"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
        active
          ? "border-coral bg-coral text-white shadow-[0_8px_18px_rgba(235,95,59,0.2)]"
          : "border-coral/20 bg-white/58 text-coral hover:border-coral/45 hover:bg-coral/10"
      )}
    >
      <Check className="h-[15px] w-[15px]" strokeWidth={2.25} />
    </button>
  );
}

function DatePill({ event }: { event: FavoriteEvent }) {
  const label = getParticipationDateLabel(event);

  return (
    <span
      className={cn(
        "flex h-8 min-w-12 items-center justify-center rounded-full px-2.5 text-[12px] font-semibold",
        isEventPast(event)
          ? "bg-foreground/8 text-foreground/45"
          : "bg-[#c8df9c] text-[#536b28]"
      )}
    >
      {label}
    </span>
  );
}

function EmptyState({
  activeTab,
}: {
  activeTab: "favorites" | "participations";
}) {
  const isParticipationTab = activeTab === "participations";

  return (
    <div className="px-6 py-12 text-center md:px-7">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-foreground/5 text-foreground/30">
        {isParticipationTab ? (
          <CalendarDays className="h-4 w-4" />
        ) : (
          <Heart className="h-4 w-4" />
        )}
      </div>
      <p className="text-[14px] font-medium text-foreground">
        {isParticipationTab
          ? "Tu n'as pas d'autres participations"
          : "Aucun favori à venir"}
      </p>
      <p className="mt-1 text-[12px] text-foreground/42">
        {isParticipationTab
          ? "Coche J'y participe depuis tes favoris"
          : "Sauvegarde les événements qui te plaisent"}
      </p>
    </div>
  );
}

function getParticipationDateLabel(event: FavoriteEvent) {
  if (isEventPast(event)) return "Terminé";

  const dateKey = getDateKey(event.dateEvent);
  if (!dateKey) return "À venir";

  const todayKey = getLocalDateKey();
  const today = new Date(`${todayKey}T12:00:00`);
  const target = new Date(`${dateKey}T12:00:00`);
  const days = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);

  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  return `${days} j`;
}
