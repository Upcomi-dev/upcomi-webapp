"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Event, SousEvent, MapEvent } from "@/lib/types/database";
import { getEventTypeColor } from "@/lib/types/database";
import { FavouriteButton } from "./favourite-button";
import { ShareButton } from "./share-button";
import { FavoriteCTA } from "./favorite-cta";
import { makeEventSlug } from "@/lib/utils/slugify";

interface EventDetailPanelProps {
  /** Basic event data already available from the list. */
  event: MapEvent;
  onBack: () => void;
}

export function EventDetailPanel({ event: mapEvent, onBack }: EventDetailPanelProps) {
  const [fullEvent, setFullEvent] = useState<Event | null>(null);
  const [sousEvents, setSousEvents] = useState<SousEvent[]>([]);
  const [favCount, setFavCount] = useState(0);

  // Fetch full details (description, URL, organisateur, sous_events)
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    Promise.all([
      fetch(`${url}/rest/v1/events?id=eq.${mapEvent.id}&select=*&limit=1`, { headers }).then((r) => r.json()),
      fetch(`${url}/rest/v1/sous_events?event_id=eq.${mapEvent.id}&select=*&order=distance.asc`, { headers }).then((r) => r.json()),
      fetch(`${url}/rest/v1/favourite_events?event=eq.${mapEvent.id}&select=id`, {
        headers: { ...headers, Prefer: "count=exact", "Range": "0-0" },
        method: "GET",
      })
        .then((r) => parseInt(r.headers.get("content-range")?.split("/")[1] || "0", 10))
        .catch(() => 0),
    ]).then(([events, sous, count]) => {
      if (events?.[0]) setFullEvent(events[0] as Event);
      if (Array.isArray(sous)) setSousEvents(sous as SousEvent[]);
      if (typeof count === "number") setFavCount(count);
    });
  }, [mapEvent.id]);

  // Use mapEvent data immediately, enrich with fullEvent when available
  const event = fullEvent ?? (mapEvent as unknown as Event);
  const typeColor = getEventTypeColor(event.type_event);
  const eventSlug = makeEventSlug(event.id, event.nomEvent);

  const formattedDate = event.dateEvent
    ? new Date(event.dateEvent).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const isSameDay = fullEvent?.dateFin && event.dateEvent && fullEvent.dateFin === event.dateEvent;
  const formattedDateFin = fullEvent?.dateFin && !isSameDay
    ? new Date(fullEvent.dateFin).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      })
    : null;

  const location = [event.villeDepart, event.paysDepart]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] text-foreground/55 transition-all hover:bg-white/80 hover:text-coral"
      >
        ← Retour à la liste
      </button>

      {/* Hero image */}
      <div
        className="relative overflow-hidden rounded-[var(--radius)]"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}
      >
        {event.image ? (
          <div className="relative h-[200px] w-full">
            <Image
              src={event.image}
              alt={event.nomEvent || "Événement"}
              fill
              className="object-cover"
              sizes="520px"
            />
          </div>
        ) : (
          <div
            className="flex h-[200px] w-full items-center justify-center"
            style={{
              background: `linear-gradient(150deg, ${typeColor} 0%, ${typeColor}aa 45%, var(--violet) 100%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap gap-2">
          {event.type_event && (
            <span
              className="rounded-full bg-white/88 px-3 py-1 text-xs font-semibold"
              style={{ color: typeColor }}
            >
              {event.type_event}
            </span>
          )}
          {event.bike_type && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
              style={{ backgroundColor: `${typeColor}dd` }}
            >
              {event.bike_type}
            </span>
          )}
        </div>
      </div>

      {/* Title + meta + Actions */}
      <div>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h1 className="font-serif text-[26px] leading-tight text-foreground">
            {event.nomEvent || "Événement"}
          </h1>
          <div className="flex flex-shrink-0 gap-2 pt-0.5">
            <FavouriteButton eventId={event.id} />
            <ShareButton
              title={event.nomEvent || "Événement"}
              url={`/event/${eventSlug}`}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-foreground/55">
          {formattedDate && (
            <span>
              {formattedDate}
              {formattedDateFin && ` — ${formattedDateFin}`}
            </span>
          )}
          {formattedDate && location && (
            <span className="text-coral/40">·</span>
          )}
          {location && <span>{location}</span>}
        </div>
      </div>

      {/* Summary card */}
      <div className="glass rounded-[var(--radius-sm)] p-4">
        <div className="space-y-2">
          {formattedDate && (
            <SummaryRow
              label="Dates"
              value={`${formattedDate}${formattedDateFin ? ` — ${formattedDateFin}` : ""}`}
            />
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

      {/* Sous-events / Parcours */}
      {sousEvents.length > 0 && (
        <div>
          <h2 className="mb-3 text-[14px] font-semibold text-foreground">
            Parcours disponibles
          </h2>
          <div className="space-y-2">
            {sousEvents.map((se) => (
              <div
                key={se.sousEventID}
                className="glass flex items-center justify-between rounded-[var(--radius-sm)] p-3.5"
              >
                <div>
                  <div className="text-[13px] font-semibold text-foreground">
                    {se.nom || "Parcours"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-foreground/55">
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
                  <span className="text-[13px] font-semibold text-foreground">
                    {se.prix} €
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {fullEvent?.description && (
        <div>
          <h2 className="mb-2 text-[14px] font-semibold text-foreground">
            Description
          </h2>
          <p className="whitespace-pre-line text-[13px] leading-[1.75] text-foreground/55">
            {fullEvent!.description}
          </p>
        </div>
      )}

      {/* Organizer */}
      {fullEvent?.organisateur && (
        <div>
          <h2 className="mb-2 text-[14px] font-semibold text-foreground">
            Organisateur
          </h2>
          <div className="glass flex items-center gap-3 rounded-[var(--radius-sm)] p-3.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-orange/30 bg-orange/20 text-[12px] font-bold text-orange-dark">
              {fullEvent!.organisateur!.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 text-[13px] font-semibold text-foreground">
              {fullEvent!.organisateur}
            </div>
            {fullEvent?.URL && (
              <a
                href={fullEvent.URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-foreground/10 px-2.5 py-1 text-[11px] font-medium text-foreground/55 transition-colors hover:border-coral/40 hover:text-coral"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Site
              </a>
            )}
          </div>
        </div>
      )}

      {/* Favorite CTA */}
      <FavoriteCTA eventId={event.id} initialCount={favCount} />

      {/* CTA — sticky at bottom */}
      {fullEvent?.URL && (
        <div className="sticky bottom-0 -mx-4 mt-4 border-t border-white/30 bg-white/80 px-4 py-3 backdrop-blur-md md:-mx-5 md:px-5">
          <div className="flex w-full flex-col items-end gap-2 text-right">
            {(() => {
              const prices = sousEvents.filter(se => se.prix != null).map(se => se.prix!);
              if (prices.length === 0) return null;
              const minPrice = Math.min(...prices);
              return (
                <div className="ml-auto flex-shrink-0 text-right">
                  <div className="text-[15px] font-semibold text-foreground">
                    {minPrice === 0 ? "Gratuit" : `À partir de ${minPrice}€`}
                  </div>
                </div>
              );
            })()}
            <a
              href={fullEvent!.URL!}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto block rounded-[var(--radius-sm)] bg-coral px-6 py-2.5 text-center text-[14px] font-semibold text-white shadow-[0_2px_12px_rgba(255,94,65,0.25)] transition-all hover:bg-coral-dark hover:shadow-[0_4px_16px_rgba(255,94,65,0.35)]"
            >
              S&apos;inscrire →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-foreground/55">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
