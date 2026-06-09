import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import type { Event } from "@/lib/types/database";
import { getEventTypeColor } from "@/lib/types/database";
import { withReturnTo } from "@/lib/utils/navigation";
import { makeEventSlug } from "@/lib/utils/slugify";
import { FavouriteButton } from "@/components/events/favourite-button";
import { AppLogo } from "@/components/layout/app-logo";
import { formatDateValue, isEventPast } from "@/lib/utils/event-dates";
import {
  getPastFavoriteEvents,
  getVisibleFavoriteEvents,
  PAST_FAVORITES_PAGE_SIZE,
} from "@/lib/utils/favorites";

interface FavoritesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FavoritesPage({ searchParams }: FavoritesPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const pastLimit = getPastLimit(params.past_limit);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // Middleware redirects to /login
  }

  const { data: favourites } = await supabase
    .from("favourite_events")
    .select("event")
    .eq("user_id", user.id);

  const eventIds = favourites?.map((f) => f.event) || [];

  let upcomingEvents: Event[] = [];
  let pastEvents: Event[] = [];
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from("events")
      .select("*")
      .in("id", eventIds);
    const favoriteRows = (data as Event[]) || [];
    upcomingEvents = getVisibleFavoriteEvents(favoriteRows);
    pastEvents = getPastFavoriteEvents(favoriteRows);
  }
  const visiblePastEvents = pastEvents.slice(0, pastLimit);
  const nextPastLimit = Math.min(pastLimit + PAST_FAVORITES_PAGE_SIZE, pastEvents.length);
  const hasMorePastEvents = visiblePastEvents.length < pastEvents.length;
  const hasEvents = upcomingEvents.length > 0 || pastEvents.length > 0;

  return (
    <div className="min-h-screen bg-[#f5efe6]">
      <header className="flex h-14 items-center justify-between border-b border-[rgba(255,255,255,0.55)] bg-white px-4" style={{ boxShadow: "var(--shadow-sm)" }}>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-[#7C7C7C] hover:text-[#2c1e14] transition-colors"
        >
          ← Retour à la carte
        </Link>
        <AppLogo href="/" imageClassName="h-7 w-auto" />
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-2xl font-bold text-[#2c1e14]">
            Mes favoris
          </h1>
        </div>

        {!hasEvents ? (
          <div className="py-16 text-center">
            <div className="mb-4 text-4xl text-[#f59e42]/40">♡</div>
            <p className="text-lg font-semibold text-[#2c1e14]">
              Aucun favori
            </p>
            <p className="mt-1 text-sm text-[#7C7C7C]">
              Sauvegarde les événements qui te plaisent pour les retrouver ici
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-2xl bg-[#f59e42] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d47a1a] transition-colors"
            >
              Explorer la carte
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2c1e14]/55">
                  À venir
                </h2>
                <span className="text-sm font-medium text-[#7C7C7C]">
                  {upcomingEvents.length} événement{upcomingEvents.length > 1 ? "s" : ""}
                </span>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <FavoriteEventRow key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-xl bg-white p-6 text-center text-sm font-medium text-[#7C7C7C]"
                  style={{ boxShadow: "var(--shadow-sm)" }}
                >
                  Aucun favori à venir
                </div>
              )}
            </section>

            {pastEvents.length > 0 ? (
              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2c1e14]/55">
                    Terminés
                  </h2>
                  <span className="text-sm font-medium text-[#7C7C7C]">
                    {pastEvents.length} événement{pastEvents.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-3">
                  {visiblePastEvents.map((event) => (
                    <FavoriteEventRow key={event.id} event={event} />
                  ))}
                </div>

                {hasMorePastEvents ? (
                  <div className="mt-4 text-center">
                    <Link
                      href={`/favorites?past_limit=${nextPastLimit}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#2c1e14]/10 bg-white px-5 text-sm font-semibold text-[#2c1e14] transition-colors hover:bg-[#f5efe6]"
                    >
                      Voir plus
                    </Link>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function FavoriteEventRow({ event }: { event: Event }) {
  const slug = makeEventSlug(event.id, event.nomEvent);
  const eventHref = withReturnTo(`/event/${slug}`, "/favorites");
  const typeColor = getEventTypeColor(event.type_event);
  const past = isEventPast(event);

  return (
    <div
      className="flex gap-4 rounded-xl bg-white p-4 transition-colors hover:bg-[#f5efe6]"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <Link href={eventHref} className="flex-shrink-0">
        {event.image ? (
          <div className="relative h-20 w-28 overflow-hidden rounded-2xl">
            <Image
              src={event.image}
              alt={event.nomEvent || "Event"}
              fill
              className="object-cover"
              sizes="112px"
            />
          </div>
        ) : (
          <div className="flex h-20 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d47a1a] to-[#f59e42]">
            <span className="font-serif text-sm font-bold text-white/50">
              {event.nomEvent?.substring(0, 2).toUpperCase() || "EV"}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 items-start justify-between">
        <Link href={eventHref} className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            {event.type_event && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: typeColor }}
              >
                {event.type_event}
              </span>
            )}
            {past ? (
              <span className="rounded-full bg-[#2c1e14]/10 px-2 py-0.5 text-xs font-semibold text-[#2c1e14]/55">
                Terminé
              </span>
            ) : null}
          </div>
          <h3 className="font-serif font-bold text-[#2c1e14]">
            {event.nomEvent || "Événement"}
          </h3>
          {event.dateEvent && (
            <p className="text-sm text-[#7C7C7C]">
              {formatDateValue(event.dateEvent, "fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
          {event.villeDepart && (
            <p className="text-sm text-[#A0A0A0]">
              {event.villeDepart}
            </p>
          )}
        </Link>

        <FavouriteButton eventId={event.id} />
      </div>
    </div>
  );
}

function getPastLimit(value: string | string[] | undefined): number {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsedValue = Number.parseInt(rawValue ?? "", 10);

  if (!Number.isFinite(parsedValue) || parsedValue < PAST_FAVORITES_PAGE_SIZE) {
    return PAST_FAVORITES_PAGE_SIZE;
  }

  return parsedValue;
}
