import Image from "next/image";
import Link from "next/link";
import type { MapEvent } from "@/lib/types/database";
import { getEventTypeColor } from "@/lib/types/database";
import { makeEventSlug } from "@/lib/utils/slugify";

interface EventPopupProps {
  event: MapEvent;
}

export function EventPopup({ event }: EventPopupProps) {
  const typeColor = getEventTypeColor(event.type_event);
  const slug = makeEventSlug(event.id, event.nomEvent);
  const name = event.nomEvent || "Événement";

  const formattedDate = event.dateEvent
    ? new Date(event.dateEvent).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const location = [event.villeDepart, event.paysDepart]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-w-[280px] overflow-hidden rounded-[var(--radius)] border border-white/60 bg-popover shadow-[var(--shadow-lg)] backdrop-blur-xl">
      {/* Hero image */}
      <div className="relative h-[140px] w-full overflow-hidden">
        {event.image ? (
          <>
            <Image
              src={event.image}
              alt={name}
              fill
              className="object-cover"
              sizes="320px"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,14,10,0.05),rgba(20,14,10,0.55))]" />
          </>
        ) : (
          <div
            className="hero-mesh flex h-full items-end px-4 pb-4"
            style={{
              backgroundImage: `radial-gradient(circle at top left, ${typeColor}55, transparent 35%), linear-gradient(140deg, ${typeColor}, ${typeColor}bb)`,
            }}
          />
        )}

        {/* Badges */}
        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          {event.type_event && (
            <span className="rounded-full border border-white/35 bg-white/86 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-[var(--shadow-sm)] backdrop-blur-sm">
              {event.type_event}
            </span>
          )}
          {event.bike_type && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-[var(--shadow-sm)] backdrop-blur-sm"
              style={{ backgroundColor: `${typeColor}e0` }}
            >
              {event.bike_type}
            </span>
          )}
        </div>

        {/* Title over image */}
        <div className="absolute inset-x-4 bottom-3 z-10">
          <h3 className="max-w-[90%] font-serif text-[17px] font-bold leading-[1.08] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.32)] text-balance">
            {name}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="panel-divider px-4 pt-3 pb-4">
        <div className="flex flex-col gap-1.5">
          {formattedDate && (
            <div className="flex items-center gap-2 text-[12px] text-foreground/55">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke="currentColor"
                className="text-foreground/35"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formattedDate}
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2 text-[12px] text-foreground/55">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke="currentColor"
                className="text-foreground/35"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>

        <Link
          href={`/event/${slug}`}
          className="mt-3.5 block w-full rounded-[var(--radius-sm)] bg-coral py-2.5 text-center text-[13px] font-semibold text-white shadow-[0_4px_20px_rgba(255,94,65,0.3)] transition-all hover:bg-coral-dark hover:shadow-[0_6px_24px_rgba(255,94,65,0.4)]"
        >
          Voir les détails
        </Link>
      </div>
    </div>
  );
}
