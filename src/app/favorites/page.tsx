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
import { getSortedFavoriteEvents, getVisibleFavoriteEvents } from "@/lib/utils/favorites";

interface FavoritesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FavoritesPage({ searchParams }: FavoritesPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const showPastEvents = params.show_past === "true";

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

  let events: Event[] = [];
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from("events")
      .select("*")
      .in("id", eventIds);
    const favoriteRows = (data as Event[]) || [];
    events = showPastEvents
      ? getSortedFavoriteEvents(favoriteRows)
      : getVisibleFavoriteEvents(favoriteRows);
  }

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
          <Link
            href={showPastEvents ? "/favorites" : "/favorites?show_past=true"}
            role="switch"
            aria-checked={showPastEvents}
            aria-label="Afficher les événements terminés"
            className={`inline-flex min-h-10 items-center justify-between gap-3 rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              showPastEvents
                ? "border-[#f59e42]/35 bg-white text-[#2c1e14]"
                : "border-white bg-white text-[#2c1e14]/60 hover:text-[#2c1e14]"
            }`}
          >
            <span>Terminés</span>
            <span
              aria-hidden="true"
              className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full p-0.5 transition-colors ${
                showPastEvents ? "bg-[#f59e42]" : "bg-[#2c1e14]/16"
              }`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white shadow-[0_1px_4px_rgba(36,23,15,0.24)] transition-transform ${
                  showPastEvents ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mb-4 text-4xl text-[#f59e42]/40">♡</div>
            <p className="text-lg font-semibold text-[#2c1e14]">
              Aucun favori à venir
            </p>
            <p className="mt-1 text-sm text-[#7C7C7C]">
              Seuls les événements futurs sont affichés sur cette page
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-2xl bg-[#f59e42] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d47a1a] transition-colors"
            >
              Explorer la carte
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const slug = makeEventSlug(event.id, event.nomEvent);
              const eventHref = withReturnTo(`/event/${slug}`, "/favorites");
              const typeColor = getEventTypeColor(event.type_event);
              const past = isEventPast(event);

              return (
                <div
                  key={event.id}
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
                      <div className="flex items-center gap-2 mb-1">
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}
