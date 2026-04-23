import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventBackLabel, sanitizeReturnTo } from "@/lib/utils/navigation";
import { parseEventSlug, makeEventSlug } from "@/lib/utils/slugify";
import { getEventTypeColor } from "@/lib/types/database";
import type { Event, SousEvent } from "@/lib/types/database";
import { FavouriteButton } from "@/components/events/favourite-button";
import { ShareButton } from "@/components/events/share-button";
import { FavoriteCTA } from "@/components/events/favorite-cta";
import { EventCard } from "@/components/events/event-card";
import { TopNav } from "@/components/layout/top-nav";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const id = parseEventSlug(slug);
  if (!id) return { title: "Événement non trouvé" };

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("nomEvent, dateEvent, villeDepart, paysDepart, description, image")
    .eq("id", id)
    .single();

  if (!event) return { title: "Événement non trouvé" };

  const title = event.nomEvent || "Événement";
  const description =
    event.description?.substring(0, 160) ||
    `${event.nomEvent} à ${event.villeDepart || "France"}`;

  return {
    title,
    description,
    openGraph: {
      title: event.nomEvent || "Événement Upcomi",
      description,
      images: event.image ? [{ url: event.image }] : [],
      type: "website",
    },
  };
}

export default async function EventPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const id = parseEventSlug(slug);
  if (!id) notFound();
  const returnTo = sanitizeReturnTo(
    typeof query.returnTo === "string" ? query.returnTo : null
  ) ?? "/";
  const backLabel = getEventBackLabel(returnTo);

  const supabase = await createClient();

  const [eventResult, sousEventsResult] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase
      .from("sous_events")
      .select("*")
      .eq("event_id", id)
      .order("distance", { ascending: true }),
  ]);

  if (eventResult.error || !eventResult.data) notFound();

  const event = eventResult.data as Event;
  const sousEvents = (sousEventsResult.data as SousEvent[]) || [];
  const typeColor = getEventTypeColor(event.type_event);
  const eventSlug = makeEventSlug(event.id, event.nomEvent);
  const [relatedEvents, favCountResult] = await Promise.all([
    event.organisateur
      ? fetchOrganizerEvents(supabase, event.organisateur, event.id)
      : Promise.resolve([]),
    supabase
      .from("favourite_events")
      .select("*", { count: "exact", head: true })
      .eq("event", event.id),
  ]);
  const favCount = favCountResult.count ?? 0;

  const formattedDate = event.dateEvent
    ? new Date(event.dateEvent).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const isSameDay = event.dateFin && event.dateEvent && event.dateFin === event.dateEvent;
  const formattedDateFin = event.dateFin && !isSameDay
    ? new Date(event.dateFin).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      })
    : null;

  const location = [event.villeDepart, event.paysDepart].filter(Boolean).join(", ");
  const prices = sousEvents.filter((se) => se.prix != null).map((se) => se.prix!);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const minPriceLabel = minPrice == null ? null : minPrice === 0 ? "Gratuit" : `À partir de ${minPrice}€`;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.nomEvent,
    startDate: event.dateEvent,
    ...(event.dateFin && { endDate: event.dateFin }),
    location: {
      "@type": "Place",
      name: event.villeDepart || "France",
      address: {
        "@type": "PostalAddress",
        addressLocality: event.villeDepart,
        addressCountry: event.paysDepart || "France",
      },
    },
    ...(event.image && { image: event.image }),
    description: event.description,
    organizer: event.organisateur
      ? { "@type": "Organization", name: event.organisateur }
      : undefined,
    ...(event.URL && { url: event.URL }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <TopNav />

      <div
        className={`mx-auto w-full max-w-[920px] px-4 pt-8 md:px-6 ${
          event.URL ? "pb-36 lg:pb-8" : "pb-8"
        }`}
      >
        {/* Back */}
        <Link
          href={returnTo}
          className="glass mb-5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] text-foreground/55 transition-all hover:bg-white/80 hover:text-coral"
        >
          ← {backLabel}
        </Link>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left column */}
          <div className="min-w-0 flex-1">
            {/* Hero */}
            <div
              className="relative mb-6 overflow-hidden rounded-[var(--radius)]"
              style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}
            >
              {event.image ? (
                <div className="relative h-[260px] w-full">
                  <Image
                    src={event.image}
                    alt={event.nomEvent || "Événement"}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
              ) : (
                <div
                  className="flex h-[260px] w-full items-center justify-center"
                  style={{
                    background: `linear-gradient(150deg, ${typeColor} 0%, ${typeColor}aa 45%, var(--violet) 100%)`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 z-10 flex flex-wrap gap-2">
                {event.type_event && (
                  <span className="rounded-full bg-white/88 px-3 py-1 text-xs font-semibold" style={{ color: typeColor }}>
                    {event.type_event}
                  </span>
                )}
                {event.bike_type && (
                  <span className="rounded-full px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm" style={{ backgroundColor: `${typeColor}dd` }}>
                    {event.bike_type}
                  </span>
                )}
              </div>
            </div>

            {/* Title + Actions */}
            <div className="mb-2.5 flex items-start justify-between gap-3">
              <h1 className="font-serif text-[32px] leading-tight text-foreground">
                {event.nomEvent || "Événement"}
              </h1>
              <div className="flex flex-shrink-0 gap-2 pt-1">
                <FavouriteButton eventId={event.id} />
                <ShareButton
                  title={event.nomEvent || "Événement"}
                  url={`/event/${eventSlug}`}
                />
              </div>
            </div>
            <div className="mb-6 flex flex-wrap gap-3.5 border-b border-black/8 pb-4">
              {formattedDate && (
                <span className="text-sm text-foreground/55">
                  {formattedDate}
                  {formattedDateFin && ` — ${formattedDateFin}`}
                </span>
              )}
              {location && <span className="text-sm text-foreground/55">{location}</span>}
            </div>

            {/* Sous-events / Parcours */}
            {sousEvents.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-3 text-[15px] font-semibold text-foreground">
                  Parcours disponibles
                </h2>
                <div className="space-y-2">
                  {sousEvents.map((se) => (
                    <div
                      key={se.sousEventID}
                      className="glass flex items-center justify-between rounded-[var(--radius-sm)] p-3.5"
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {se.nom || "Parcours"}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-foreground/55">
                          {se.distance && <span>{se.distance} km</span>}
                          {se.elevation && (
                            <>
                              <span className="text-coral/70">·</span>
                              <span>{se.elevation} m D+</span>
                            </>
                          )}
                          {(se.bikeType || se.typeEvent) && (
                            <>
                              <span className="text-coral/70">·</span>
                              <span>{se.bikeType || se.typeEvent}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {se.prix != null && (
                        <span className="text-sm font-semibold text-foreground">
                          {se.prix} €
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="mb-6">
                <h2 className="mb-3 text-[15px] font-semibold text-foreground">
                  Description
                </h2>
                <p className="whitespace-pre-line text-sm leading-[1.75] text-foreground/55">
                  {event.description}
                </p>
              </div>
            )}

            {/* Organizer */}
            {event.organisateur && (
              <div className="mb-6">
                <h2 className="mb-3 text-[15px] font-semibold text-foreground">
                  Organisateur
                </h2>
                <div className="glass flex items-center gap-3 rounded-[var(--radius-sm)] p-3.5 transition-all hover:bg-white/80">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-orange/20 border border-orange/30 text-sm font-bold text-orange-dark">
                    {event.organisateur.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{event.organisateur}</div>
                  </div>
                  {event.URL && (
                    <a
                      href={event.URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground/55 transition-colors hover:border-coral/40 hover:text-coral"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Voir le site
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Favorite CTA */}
            <div className="mb-6">
              <FavoriteCTA eventId={event.id} initialCount={favCount} />
            </div>

            {relatedEvents.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-3 text-[15px] font-semibold text-foreground">
                  Autres événements de cette organisation
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {relatedEvents.map((relatedEvent) => (
                    <EventCard
                      key={relatedEvent.id}
                      id={relatedEvent.id}
                      nomEvent={relatedEvent.nomEvent}
                      dateEvent={relatedEvent.dateEvent}
                      image={relatedEvent.image}
                      bike_type={relatedEvent.bike_type}
                      type_event={relatedEvent.type_event}
                      villeDepart={relatedEvent.villeDepart}
                      paysDepart={relatedEvent.paysDepart}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — CTA card */}
          <div className="w-full flex-shrink-0 lg:w-[300px]">
            <div className="lg:sticky lg:top-24">
              <div className="hidden space-y-4 lg:block">
                {event.URL && (
                  <div
                    className="glass flex items-center justify-between gap-4 rounded-[var(--radius)] p-4"
                    style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
                  >
                    <div className="min-w-0">
                      {minPriceLabel && (
                        <div className="text-[16px] font-semibold text-foreground">
                          {minPriceLabel}
                        </div>
                      )}
                    </div>
                    <a
                      href={event.URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 rounded-[var(--radius-sm)] bg-coral px-5 py-2.5 text-center text-[14px] font-semibold text-white transition-all hover:bg-coral-dark"
                      style={{ boxShadow: "0 2px 12px rgba(255,94,65,0.25)" }}
                    >
                      S&apos;inscrire →
                    </a>
                  </div>
                )}

                <div
                  className="glass rounded-[var(--radius)] p-5"
                  style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  {/* Details summary */}
                  <div className="space-y-1.5">
                    {formattedDate && (
                      <SummaryRow label="Dates" value={`${formattedDate}${formattedDateFin ? ` — ${formattedDateFin}` : ""}`} />
                    )}
                    {event.villeDepart && (
                      <SummaryRow label="Lieu" value={event.villeDepart} />
                    )}
                    {event.paysDepart && (
                      <SummaryRow label="Pays" value={event.paysDepart} />
                    )}
                    {event.type_event && (
                      <SummaryRow label="Type" value={event.type_event} />
                    )}
                  {event.bike_type && (
                    <SummaryRow label="Vélo" value={event.bike_type} />
                  )}
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {event.URL && (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
          <div
            className="mx-auto w-full max-w-[920px] px-4 pt-3 md:px-6"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div
              className="glass flex items-center justify-between gap-4 rounded-[var(--radius)] p-4"
              style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
            >
              <div className="min-w-0">
                {minPriceLabel && (
                  <div className="text-[16px] font-semibold text-foreground">
                    {minPriceLabel}
                  </div>
                )}
              </div>
              <a
                href={event.URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded-[var(--radius-sm)] bg-coral px-5 py-2.5 text-center text-[14px] font-semibold text-white transition-all hover:bg-coral-dark"
                style={{ boxShadow: "0 2px 12px rgba(255,94,65,0.25)" }}
              >
                S&apos;inscrire →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-foreground/55">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

async function fetchOrganizerEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizer: string,
  currentEventId: number
) {
  const today = getTodayDateKey();
  const { data } = await supabase
    .from("events")
    .select("id, nomEvent, dateEvent, image, bike_type, type_event, villeDepart, paysDepart")
    .eq("organisateur", organizer)
    .neq("id", currentEventId)
    .or(`dateFin.gte.${today},and(dateFin.is.null,dateEvent.gte.${today})`)
    .order("dateEvent", { ascending: true })
    .limit(6);

  return data ?? [];
}

function getTodayDateKey() {
  return new Date().toISOString().split("T")[0];
}
