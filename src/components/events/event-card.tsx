import Link from "next/link";
import Image from "next/image";
import { makeEventSlug } from "@/lib/utils/slugify";
import { getEventTypeColor } from "@/lib/types/database";
import { FavouriteButton } from "./favourite-button";

interface EventCardProps {
  id: number;
  nomEvent: string | null;
  dateEvent: string | null;
  image: string | null;
  bike_type: string | null;
  type_event: string | null;
  villeDepart: string | null;
  paysDepart: string | null;
  distance?: string | null;
  variant?: "grid" | "list" | "carousel";
  isSelected?: boolean;
  onEventClick?: (id: number) => void;
  onEventHover?: (id: number | null) => void;
}

export function EventCard({
  id,
  nomEvent,
  dateEvent,
  image,
  bike_type,
  type_event,
  villeDepart,
  paysDepart,
  variant = "grid",
  isSelected = false,
  onEventClick,
  onEventHover,
}: EventCardProps) {
  const slug = makeEventSlug(id, nomEvent);
  const typeColor = getEventTypeColor(type_event);
  const name = nomEvent || "Événement";

  const formattedDate = dateEvent
    ? new Date(dateEvent).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      })
    : null;

  const location = [villeDepart, paysDepart].filter(Boolean).join(", ");

  if (variant === "carousel") {
    return (
      <div
        role="button"
        tabIndex={0}
        className="group flex h-[280px] w-[260px] flex-none cursor-pointer snap-start flex-col overflow-hidden rounded-[22px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,251,246,0.92),rgba(248,240,230,0.82))] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:border-orange/40 hover:shadow-[var(--shadow-md)]"
        onClick={() => onEventClick?.(id)}
        onKeyDown={(e) => { if (e.key === "Enter") onEventClick?.(id); }}
        onMouseEnter={() => onEventHover?.(id)}
        onMouseLeave={() => onEventHover?.(null)}
      >
        <div className="relative h-[160px] w-full flex-none overflow-hidden">
          {image ? (
            <>
              <Image
                src={image}
                alt={name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="260px"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,14,10,0.04),rgba(20,14,10,0.34))]" />
            </>
          ) : (
            <div
              className="flex h-full items-end p-3"
              style={{
                backgroundImage: `radial-gradient(circle at top left, ${typeColor}55, transparent 35%), linear-gradient(140deg, ${typeColor}, ${typeColor}bb)`,
              }}
            />
          )}
          <div className="absolute right-2.5 top-2.5 z-10">
            <FavouriteButton eventId={id} />
          </div>
          {type_event && (
            <div className="absolute bottom-2.5 left-2.5 z-10">
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm"
                style={{ backgroundColor: `${typeColor}de` }}
              >
                {type_event}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between p-3">
          <h3 className="line-clamp-2 font-serif text-[16px] leading-[1.15] text-foreground">
            {name}
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-foreground/55">
            <span>{formattedDate || "À venir"}</span>
            <span className="text-coral/55">·</span>
            <span className="truncate">{location || "Lieu à confirmer"}</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "list") {
    const cardClassName = `group block overflow-hidden rounded-[28px] border p-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange/40 hover:shadow-[var(--shadow-md)] ${
      isSelected
        ? "border-coral/50 bg-[linear-gradient(180deg,rgba(255,245,240,0.95),rgba(255,240,232,0.88))] shadow-[var(--shadow-md),0_0_0_1px_rgba(235,95,59,0.12)]"
        : "border-white/55 bg-[linear-gradient(180deg,rgba(255,251,246,0.92),rgba(248,240,230,0.82))] shadow-[var(--shadow-sm)]"
    }`;

    const Wrapper = onEventClick
      ? ({ children: c }: { children: React.ReactNode }) => (
          <div
            role="button"
            tabIndex={0}
            className={`${cardClassName} cursor-pointer`}
            onClick={() => onEventClick(id)}
            onKeyDown={(e) => { if (e.key === "Enter") onEventClick(id); }}
            onMouseEnter={() => onEventHover?.(id)}
            onMouseLeave={() => onEventHover?.(null)}
          >
            {c}
          </div>
        )
      : ({ children: c }: { children: React.ReactNode }) => (
          <Link href={`/event/${slug}`} className={cardClassName}>
            {c}
          </Link>
        );

    return (
      <Wrapper>
        <div className="flex gap-3">
          <div className="relative h-28 w-28 flex-none overflow-hidden rounded-[22px] sm:h-32 sm:w-32">
            {image ? (
              <>
                <Image
                  src={image}
                  alt={name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="128px"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,14,10,0.04),rgba(20,14,10,0.34))]" />
              </>
            ) : (
              <div
                className="hero-mesh flex h-full items-end justify-start p-3"
                style={{
                  backgroundImage: `radial-gradient(circle at top left, ${typeColor}55, transparent 35%), linear-gradient(140deg, ${typeColor}, ${typeColor}bb)`,
                }}
              >
                <div className="font-serif text-base font-bold leading-tight text-white text-balance">
                  {name}
                </div>
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  {type_event && (
                    <span className="rounded-full border border-white/45 bg-white/84 px-2.5 py-1 text-foreground/72">
                      {type_event}
                    </span>
                  )}
                  {bike_type && (
                    <span
                      className="rounded-full px-2.5 py-1 text-white"
                      style={{ backgroundColor: `${typeColor}de` }}
                    >
                      {bike_type}
                    </span>
                  )}
                </div>
                <FavouriteButton eventId={id} />
              </div>

              <h3 className="max-w-[24ch] font-serif text-[21px] leading-[1.02] text-foreground text-balance">
                {name}
              </h3>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-foreground/58">
                <span>{formattedDate || "À venir"}</span>
                <span className="text-coral/55">•</span>
                <span className="truncate">{location || "Lieu à confirmer"}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                Vue carte + détails
              </div>
              <div className="rounded-full border border-coral/16 bg-coral/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral transition-colors group-hover:bg-coral group-hover:text-white">
                Ouvrir
              </div>
            </div>
          </div>
        </div>
      </Wrapper>
    );
  }

  return (
    <Link
      href={`/event/${slug}`}
      className="glass grain-overlay group block overflow-hidden border border-white/55 transition-all duration-300 hover:-translate-y-1.5 hover:border-orange/45"
    >
      <div className="relative h-40 overflow-hidden rounded-t-[calc(var(--radius)-1px)]">
        {image ? (
          <>
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-108"
              sizes="(max-width: 768px) 200px, 220px"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,14,10,0.05),rgba(20,14,10,0.58))]" />
          </>
        ) : (
          <div
            className="hero-mesh flex h-full items-end justify-start px-4 pb-4"
            style={{
              backgroundImage: `radial-gradient(circle at top left, ${typeColor}55, transparent 35%), linear-gradient(140deg, ${typeColor}, ${typeColor}bb)`,
            }}
          >
          </div>
        )}

        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {type_event && (
              <span className="rounded-full border border-white/35 bg-white/86 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-[var(--shadow-sm)] backdrop-blur-sm">
                {type_event}
              </span>
            )}
          </div>
          {bike_type && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-[var(--shadow-sm)] backdrop-blur-sm"
              style={{ backgroundColor: `${typeColor}e0` }}
            >
              {bike_type}
            </span>
          )}
        </div>

        <div className="absolute inset-x-4 bottom-4 z-10">
          <div className="max-w-[90%] font-serif text-[18px] font-bold leading-[1.05] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.32)] text-balance">
            {name}
          </div>
        </div>
      </div>

      <div className="panel-divider p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
          <span>{formattedDate || "À venir"}</span>
          <span className="text-coral/70">Explorer</span>
        </div>
        <div className="mb-2 text-sm font-semibold text-foreground truncate">{name}</div>
        <div className="flex items-center gap-1.5 text-[12px] text-foreground/55">
          <span className="truncate">{location || "Lieu à confirmer"}</span>
        </div>
      </div>
    </Link>
  );
}
