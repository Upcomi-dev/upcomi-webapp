import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { parseEventSlug, makeEventSlug } from "@/lib/utils/slugify";
import { getEventTypeColor } from "@/lib/types/database";
import type { Event, SousEvent } from "@/lib/types/database";
import { FavouriteButton } from "@/components/events/favourite-button";
import { ShareButton } from "@/components/events/share-button";
import { EventCard } from "@/components/events/event-card";
import { TopNav } from "@/components/layout/top-nav";

interface PageProps {
  params: Promise<{ slug: string }>;
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

  const title = `${event.nomEvent || "Événement"} — Upcomi`;
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

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const id = parseEventSlug(slug);
  if (!id) notFound();

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
  const relatedEvents = event.organisateur
    ? await fetchOrganizerEvents(supabase, event.organisateur, event.id)
    : [];

  const formattedDate = event.dateEvent
    ? new Date(event.dateEvent).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const formattedDateFin = event.dateFin
    ? new Date(event.dateFin).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      })
    : null;

  const location = [event.villeDepart, event.paysDepart].filter(Boolean).join(", ");

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

      <div className="mx-auto w-full max-w-[920px] px-4 py-8 md:px-6">
        {/* Back */}
        <Link
          href="/"
          className="glass mb-5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] text-foreground/55 transition-all hover:bg-white/80 hover:text-coral"
        >
          ← Retour à la carte
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
                {event.verifie && (
                  <span className="glass-dark rounded-full px-3 py-1 text-xs font-semibold text-white">
                    Sélection upcomi
                  </span>
                )}
              </div>
            </div>

            {/* Title + Meta */}
            <h1 className="mb-2.5 font-serif text-[32px] leading-tight text-foreground">
              {event.nomEvent || "Événement"}
            </h1>
            <div className="mb-4 flex flex-wrap gap-3.5 border-b border-black/8 pb-4">
              {formattedDate && (
                <span className="text-sm text-foreground/55">
                  {formattedDate}
                  {formattedDateFin && ` — ${formattedDateFin}`}
                </span>
              )}
              {location && <span className="text-sm text-foreground/55">{location}</span>}
            </div>

            {/* Action buttons */}
            <div className="mb-6 flex gap-2 border-b border-black/8 pb-6">
              <FavouriteButton eventId={event.id} />
              <ShareButton
                title={event.nomEvent || "Événement"}
                url={`/event/${eventSlug}`}
              />
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
                </div>
              </div>
            )}

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

            {/* Extra tags */}
            <div className="flex flex-wrap gap-2 text-sm">
              {event.Dotwatching && (
                <span className="glass rounded-full px-3 py-1 text-foreground/55">
                  📡 Dotwatching
                </span>
              )}
              {event.budget && (
                <span className="glass rounded-full px-3 py-1 text-foreground/55">
                  {event.budget}
                </span>
              )}
              {event.distance && (
                <span className="glass rounded-full px-3 py-1 text-foreground/55">
                  {event.distance}
                </span>
              )}
            </div>
          </div>

          {/* Right column — CTA card */}
          <div className="w-full flex-shrink-0 lg:w-[300px]">
            <div className="lg:sticky lg:top-24">
              <div
                className="glass rounded-[var(--radius)] p-5"
                style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
              >
                {/* Price */}
                {sousEvents.length > 0 && sousEvents[0].prix != null && (
                  <>
                    <div className="font-serif text-[28px] text-foreground">
                      À partir de {Math.min(...sousEvents.filter(se => se.prix != null).map(se => se.prix!))}€
                    </div>
                    <div className="mb-4 text-xs text-foreground/55">
                      Inscription sur le site de l&apos;organisateur
                    </div>
                  </>
                )}

                {/* Register button */}
                {event.URL && (
                  <a
                    href={event.URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2.5 block w-full rounded-[var(--radius-sm)] bg-coral py-3.5 text-center text-[15px] font-semibold text-white transition-all hover:bg-coral-dark"
                    style={{ boxShadow: "0 4px 20px rgba(255,94,65,0.35)" }}
                  >
                    S&apos;inscrire →
                  </a>
                )}

                {/* Separator */}
                <div className="my-4 h-px bg-black/7" />

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

                {event.verifie && (
                  <>
                    <div className="my-4 h-px bg-black/7" />
                    <p className="text-center text-xs leading-relaxed text-foreground/55">
                      Sélectionné & vérifié par l&apos;équipe upcomi
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
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
  const { data } = await supabase
    .from("events")
    .select("id, nomEvent, dateEvent, image, bike_type, type_event, villeDepart, paysDepart")
    .eq("organisateur", organizer)
    .neq("id", currentEventId)
    .not("dateEvent", "is", null)
    .order("dateEvent", { ascending: true })
    .limit(6);

  return data ?? [];
}
