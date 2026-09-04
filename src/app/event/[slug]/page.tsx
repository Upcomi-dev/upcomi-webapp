import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Calendar, ChevronLeft, Euro, ExternalLink, Flag, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEventBackLabel, sanitizeReturnTo } from "@/lib/utils/navigation";
import { getLocalDateKey, isEventPast } from "@/lib/utils/event-dates";
import { getEventKeyDates } from "@/lib/utils/event-key-dates";
import { findNearestStation } from "@/lib/utils/stations";
import { fetchEventInclusionMeasures } from "@/lib/events/inclusion-measures";
import { getEventFactTags } from "@/lib/events/facts";
import { fetchEventStories, fetchEventStoryCount } from "@/lib/events/stories";
import { getEventPath, getEventUrl, serializeJsonLd, SITE_NAME } from "@/lib/seo";
import { parseLegacyEventId } from "@/lib/utils/slugify";
import { getEventTypeColor } from "@/lib/types/database";
import { getAppStorageImage, getAppStorageImageUrl } from "@/lib/storage/urls";
import type { Event, SousEvent } from "@/lib/types/database";
import { ShareButton } from "@/components/events/share-button";
import { ExternalRegistrationLink } from "@/components/events/external-registration-link";
import { EventActions } from "@/components/events/event-actions";
import { EventCard } from "@/components/events/event-card";
import { StickyActionBar } from "@/components/events/sticky-action-bar";
import { EventKeyDates } from "@/components/events/event-key-dates";
import { EventViewTracker } from "@/components/events/event-view-tracker";
import { EventStories } from "@/components/events/event-stories";
import { InterestedPeopleProvider } from "@/components/events/interested-people-context";
import { InterestedBlock } from "@/components/events/interested-block";
import { InclusionMeasures } from "@/components/events/inclusion-measures";
import { MixiteBadge } from "@/components/events/mixite-badge";
import { AppFooter } from "@/components/layout/app-footer";
import { TopNav } from "@/components/layout/top-nav";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const event = await fetchEventForMetadata(supabase, slug);

  if (!event) return { title: "Événement non trouvé" };

  const title = event.nomEvent || "Événement";
  const description = buildMetadataDescription(event);
  const metadataImage = getAppStorageImageUrl(event.image, { absolute: true });
  const canonicalPath = getEventPath(event.slug);
  const canonicalUrl = getEventUrl(event.slug);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: event.nomEvent || "Événement Upcomi",
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: metadataImage ? [{ url: metadataImage }] : [],
      locale: "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: event.nomEvent || "Événement Upcomi",
      description,
      images: metadataImage ? [metadataImage] : [],
    },
  };
}

export default async function EventPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const returnTo = sanitizeReturnTo(
    typeof query.returnTo === "string" ? query.returnTo : null
  ) ?? "/";
  const backLabel = getEventBackLabel(returnTo);

  const supabase = await createClient();

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("verifie", true)
    .maybeSingle();

  if (!eventData) {
    const legacyId = parseLegacyEventId(slug);
    if (legacyId != null) {
      const legacyResult = await supabase
        .from("events")
        .select("slug")
        .eq("id", legacyId)
        .eq("verifie", true)
        .maybeSingle();

      if (legacyResult.data?.slug) {
        permanentRedirect(getEventPath(legacyResult.data.slug));
      }
    }
  }

  if (eventError || !eventData) notFound();

  const event = eventData as Event;
  const { data: sousEventsData } = await supabase
      .from("sous_events")
      .select("*")
      .eq("event_id", event.id)
      .order("distance", { ascending: true });

  const eventImage = getAppStorageImage(event.image);
  const sousEvents = (sousEventsData as SousEvent[]) || [];
  const typeColor = getEventTypeColor(event.type_event);
  const eventSlug = event.slug;
  const canonicalUrl = getEventUrl(eventSlug);
  // Le compteur d'intéressé·es n'est plus lu ici : il fait partie du bloc
  // « qui est intéressé », traité dans sa propre brique.

  // Les récits ne sont lisibles que par les personnes connectées
  // (`get_event_stories` n'est exécutable que par `authenticated`) ; le
  // compteur, lui, est ouvert et sert le teaser affiché aux autres.
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const [relatedEvents, inclusionMeasures, stories, storyCount] = await Promise.all([
    event.organisateur
      ? fetchOrganizerEvents(supabase, event.organisateur, event.id)
      : Promise.resolve([]),
    fetchEventInclusionMeasures(supabase, event.id),
    viewer ? fetchEventStories(supabase, event.id) : Promise.resolve([]),
    fetchEventStoryCount(supabase, event.id),
  ]);

  // Gare la plus proche du départ, calculée au rendu depuis le référentiel
  // embarqué : venir sans voiture est un critère de décision relevé en test.
  const nearestStation = findNearestStation(event.latitude, event.longitude);
  const keyDates = getEventKeyDates(event, { station: nearestStation });

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

  // Repères affichés sur l'image : les mêmes que sur la carte d'évènement, pour
  // retrouver en haut de fiche ce sur quoi on vient de filtrer.
  const heroFacts = [
    ...getEventFactTags({
      dateEvent: event.dateEvent,
      dateFin: event.dateFin,
      distance: event.distance,
      maxElevation: maxElevation(sousEvents),
    }),
    event.bike_type,
  ].filter((fact): fact is string => Boolean(fact));

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.nomEvent,
    startDate: event.dateEvent,
    ...(event.dateFin && { endDate: event.dateFin }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.villeDepart || "France",
      address: {
        "@type": "PostalAddress",
        addressLocality: event.villeDepart,
        addressCountry: event.paysDepart || "France",
      },
    },
    ...(eventImage && { image: getAppStorageImageUrl(event.image, { absolute: true }) }),
    description: event.description,
    organizer: event.organisateur
      ? { "@type": "Organization", name: event.organisateur }
      : undefined,
    ...(event.type_event && { keywords: [event.type_event, event.bike_type].filter(Boolean) }),
    url: canonicalUrl,
    ...(event.URL && {
      offers: {
        "@type": "Offer",
        url: event.URL,
        availability:
          event.inscriptions_ouvertes === false
            ? "https://schema.org/SoldOut"
            : "https://schema.org/InStock",
        ...(minPrice != null && { price: minPrice, priceCurrency: "EUR" }),
      },
    }),
  };

  return (
    // Les personnes intéressées sont chargées une seule fois pour toute la
    // fiche : le bloc du haut, celui de la colonne de droite, celui de la barre
    // collante et la feuille de personnes lisent la même liste.
    <InterestedPeopleProvider eventId={event.id}>
      <div className="flex min-h-screen flex-col">
      <EventViewTracker
        eventId={event.id}
        eventType={event.type_event}
        bikeType={event.bike_type}
        organizer={event.organisateur}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <TopNav />

      {/* La barre collante en mobile est là quelle que soit la présence d'un
          lien d'inscription — « Ça m'intéresse » y figure toujours : la page
          lui réserve sa place en bas à toutes les fiches. */}
      <div className="mx-auto w-full max-w-[1040px] flex-1 px-4 pt-8 pb-40 md:px-6 lg:pb-8">
        {/* Back */}
        <Link
          href={returnTo}
          className="mb-2 inline-flex items-center gap-1.5 py-1 text-[13px] text-foreground/55 transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {backLabel}
        </Link>

        {/* Hero — le titre est dans l'image, les repères (durée, distance,
            dénivelé) juste au-dessus, dans le flux : posés à un offset
            fixe, ils finissaient par chevaucher un titre sur deux lignes. */}
        <div
          className="relative mb-5 flex h-[320px] flex-col justify-end overflow-hidden rounded-[var(--radius)]"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}
        >
          {eventImage ? (
            <Image
              src={eventImage.src}
              alt={event.nomEvent || "Événement"}
              fill
              unoptimized={eventImage.unoptimized}
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 600px"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(150deg, ${typeColor} 0%, ${typeColor}aa 45%, var(--violet) 100%)`,
              }}
            />
          )}
          <div className="absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_40%,rgba(0,0,0,0.75)_100%)]" />

          <div className="relative z-[2] flex flex-wrap items-center gap-2 px-5 pb-2.5">
            {event.mint && <MixiteBadge />}
            {heroFacts.map((fact) => (
              <span
                key={fact}
                className="rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-foreground"
              >
                {fact}
              </span>
            ))}
          </div>
          <h1 className="relative z-[2] px-5 pb-5 font-serif text-[clamp(24px,5vw,40px)] font-bold leading-[1.15] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]">
            {event.nomEvent || "Événement"}
          </h1>
        </div>

        {/* Synthèse : type · date · lieu · prix. Le favori et l'inscription
            ne figurent pas dans cette ligne — ils font doublon avec le bloc
            d'intérêt juste en dessous et avec le bloc d'inscription
            (barre collante en mobile, colonne de droite en desktop). */}
        <div className="mb-3.5 flex flex-nowrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-[18px] gap-y-1 text-sm font-bold text-foreground">
            {event.type_event && (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Flag className="h-3.5 w-3.5 flex-none" strokeWidth={1.8} />
                {event.type_event}
              </span>
            )}
            {formattedDate && (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 flex-none" strokeWidth={1.8} />
                {formattedDate}
                {formattedDateFin && ` — ${formattedDateFin}`}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <MapPin className="h-3.5 w-3.5 flex-none" strokeWidth={1.8} />
                {location}
              </span>
            )}
            {minPriceLabel && (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Euro className="h-3.5 w-3.5 flex-none" strokeWidth={1.8} />
                {minPriceLabel}
              </span>
            )}
          </div>
          <div className="flex-none">
            <ShareButton
              title={event.nomEvent || "Événement"}
              url={`/event/${eventSlug}`}
              eventId={event.id}
            />
          </div>
        </div>

        {/* Qui est intéressé — juste au-dessus de « M'inscrire » et « Ça
            m'intéresse », comme dans le proto : l'intérêt social se montre au
            moment du geste. Masqué en desktop avec la paire qu'il accompagne :
            la colonne de droite porte le sien, et le laisser ici affichait deux
            fois le même compteur sur le même écran. */}
        <InterestedBlock
          eventId={event.id}
          eventName={event.nomEvent || "cet évènement"}
          className="mb-3.5 lg:hidden"
        />

        {/* Actions principales, visibles dès l'arrivée sur la fiche. Masquées
            en desktop : la colonne de droite les porte en permanence, les
            répéter ici leur donnerait deux fois la même place. */}
        <EventActions
          eventId={event.id}
          registrationUrl={event.URL}
          eventType={event.type_event}
          organizer={event.organisateur}
          source="detail_top"
          className="mb-6 border-b border-black/8 pb-5 lg:hidden"
        />

        {/* Le contenu suit un ordre de lecture linéaire ; seul le bloc
            d'inscription en sort à partir du desktop, où il devient une
            colonne de droite plutôt que la barre collante du mobile. */}
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            {/* Description */}
            {event.description && (
              <div className="mb-6">
                <p className="whitespace-pre-line text-[15px] leading-[1.75] text-foreground/55">
                  {event.description}
                </p>
              </div>
            )}

            {sousEvents.length > 0 && (
              <div className="mb-6">
                <div className="space-y-2.5">
                  {sousEvents.map((se) => (
                    <div
                      key={se.sousEventID}
                      className="glass flex items-center justify-between gap-3 rounded-[var(--radius-sm)] p-3.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {se.nom || "Parcours"}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[13px] text-foreground/55">
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
                      {se.prix != null &&
                        (event.URL ? (
                          <ExternalRegistrationLink
                            href={event.URL}
                            eventId={event.id}
                            eventType={event.type_event}
                            organizer={event.organisateur}
                            className="inline-flex flex-none items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-foreground/70"
                          >
                            {se.prix} €
                          </ExternalRegistrationLink>
                        ) : (
                          <span className="flex-none text-sm font-semibold text-foreground">
                            {se.prix} €
                          </span>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <EventKeyDates eventId={event.id} dates={keyDates} />

            <div className="glass mb-6 rounded-[var(--radius)] p-5">
              <h2 className="mb-4 font-serif text-[22px] leading-tight text-foreground">
                Qui organise&nbsp;?
              </h2>

              {event.organisateur ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-orange/30 bg-orange/20 text-sm font-bold text-orange-dark">
                    {event.organisateur.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">
                      {event.organisateur}
                    </div>
                  </div>
                  {event.URL && (
                    <a
                      href={event.URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary btn-small flex-none"
                    >
                      Voir le site
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-foreground/55">
                  L&apos;organisation de cet évènement n&apos;est pas encore renseignée.
                </p>
              )}

              <InclusionMeasures
                eventName={event.nomEvent || "cet évènement"}
                measures={inclusionMeasures}
              />

              {/* Slider horizontal de lignes compactes (miniature + nom +
                  date/lieu) plutôt que de grandes cartes photo : ces
                  évènements sont une sortie possible depuis la fiche, ils ne
                  doivent pas concurrencer celui qu'on est en train de lire. */}
              {relatedEvents.length > 0 && (
                <div className="mt-7">
                  <h3 className="mb-2.5 text-[16px] font-semibold text-foreground/55">
                    Leurs autres évènements
                  </h3>
                  <div className="scrollbar-hide -mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5">
                    {relatedEvents.map((relatedEvent) => (
                      <div key={relatedEvent.id} className="w-[240px] flex-none snap-start">
                        <EventCard
                          id={relatedEvent.id}
                          slug={relatedEvent.slug}
                          nomEvent={relatedEvent.nomEvent}
                          dateEvent={relatedEvent.dateEvent}
                          dateFin={relatedEvent.dateFin}
                          image={relatedEvent.image}
                          bike_type={relatedEvent.bike_type}
                          type_event={relatedEvent.type_event}
                          villeDepart={relatedEvent.villeDepart}
                          paysDepart={relatedEvent.paysDepart}
                          distance={relatedEvent.distance}
                          mint={relatedEvent.mint}
                          variant="compact"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Les retours d'expérience ferment la colonne, comme dans le
                prototype : on les lit après avoir compris de quoi il s'agit
                et qui organise. */}
            <EventStories
              event={{
                id: event.id,
                nomEvent: event.nomEvent,
                image: event.image,
                slug: eventSlug,
              }}
              stories={stories}
              storyCount={storyCount}
              isPast={isEventPast(event)}
            />
          </div>

          {/* Colonne de droite — le bloc d'action quitte la barre collante du
              mobile pour devenir une sidebar visible en permanence pendant la
              lecture. La synthèse type/date/lieu/prix n'y est pas répétée :
              elle est déjà sous le titre. */}
          <div className="hidden flex-shrink-0 lg:block lg:w-[280px]">
            <div className="lg:sticky lg:top-24">
              <div
                className="glass rounded-[var(--radius)] p-4"
                style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
              >
                <InterestedBlock
                  eventId={event.id}
                  eventName={event.nomEvent || "cet évènement"}
                  size="compact"
                  className="mb-3"
                />
                <EventActions
                  eventId={event.id}
                  registrationUrl={event.URL}
                  eventType={event.type_event}
                  organizer={event.organisateur}
                  orientation="column"
                  source="detail_sidebar"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />

      {/* Barre collante en mobile : les mêmes actions qu'en haut de fiche,
          à portée quel que soit l'endroit où on est dans la lecture. */}
      <StickyActionBar>
        <div
          className="mx-auto w-full max-w-[1040px] px-4 pt-3 md:px-6"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div
            className="glass rounded-[var(--radius)] p-4"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
          >
            <InterestedBlock
              eventId={event.id}
              eventName={event.nomEvent || "cet évènement"}
              size="compact"
              className="mb-2.5"
            />
            <EventActions
              eventId={event.id}
              registrationUrl={event.URL}
              eventType={event.type_event}
              organizer={event.organisateur}
              source="detail_sticky"
            />
          </div>
        </div>
      </StickyActionBar>
      </div>
    </InterestedPeopleProvider>
  );
}

/** Dénivelé le plus élevé, tous parcours confondus. */
function maxElevation(sousEvents: SousEvent[]): number | null {
  const values = sousEvents
    .map((se) => se.elevation)
    .filter((value): value is number => typeof value === "number" && value > 0);
  return values.length > 0 ? Math.max(...values) : null;
}

async function fetchOrganizerEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizer: string,
  currentEventId: number
) {
  const today = getTodayDateKey();
  const { data } = await supabase
    .from("events")
    .select("id, slug, nomEvent, dateEvent, dateFin, image, bike_type, type_event, villeDepart, paysDepart, distance, mint")
    .eq("organisateur", organizer)
    .eq("verifie", true)
    .neq("id", currentEventId)
    .or(`dateFin.gte.${today},and(dateFin.is.null,dateEvent.gte.${today})`)
    .order("dateEvent", { ascending: true })
    .limit(6);

  return data ?? [];
}

async function fetchEventForMetadata(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string
) {
  const baseSelect = "id, slug, nomEvent, dateEvent, villeDepart, paysDepart, description, image";
  const { data: event } = await supabase
    .from("events")
    .select(baseSelect)
    .eq("slug", slug)
    .eq("verifie", true)
    .maybeSingle();

  if (event) return event;

  const legacyId = parseLegacyEventId(slug);
  if (legacyId == null) return null;

  const { data: legacyEvent } = await supabase
    .from("events")
    .select(baseSelect)
    .eq("id", legacyId)
    .eq("verifie", true)
    .maybeSingle();

  return legacyEvent;
}

function buildMetadataDescription(event: {
  nomEvent: string | null;
  villeDepart: string | null;
  description: string | null;
}) {
  const description = event.description?.replace(/\s+/g, " ").trim();
  if (description) return description.slice(0, 160);

  return `${event.nomEvent || "Événement vélo"} à ${event.villeDepart || "France"}`;
}

function getTodayDateKey() {
  return getLocalDateKey();
}
