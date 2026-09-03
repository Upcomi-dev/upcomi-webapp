"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { makeLegacyEventSlug } from "@/lib/utils/slugify";
import { getEventTypeColor } from "@/lib/types/database";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getEventFactTags } from "@/lib/events/facts";
import { formatDateValue, getDateKey, isEventPast } from "@/lib/utils/event-dates";
import { getAppStorageImage } from "@/lib/storage/urls";
import { FavouriteButton } from "./favourite-button";
import { MixiteBadge } from "./mixite-badge";

interface EventCardProps {
  id: number;
  slug: string | null;
  nomEvent: string | null;
  dateEvent: string | null;
  image: string | null;
  bike_type: string | null;
  type_event: string | null;
  villeDepart: string | null;
  paysDepart: string | null;
  dateFin?: string | null;
  distance?: string | null;
  /** Dénivelé le plus élevé des parcours — voir `fetchEventMaxElevations`. */
  maxElevation?: number | null;
  mint?: boolean | null;
  /**
   * `carousel` et `list` sont la même tuile photo, à deux tailles ; `compact`
   * est la ligne miniature + titre utilisée quand la carte ne doit pas
   * concurrencer le contenu principal (« Leurs autres évènements »).
   */
  variant?: "carousel" | "list" | "compact";
  carouselLayout?: "default" | "map-preview";
  isSelected?: boolean;
  onEventClick?: (id: number) => void;
  onEventHover?: (id: number | null) => void;
}

const PLACEHOLDER_IMAGE_SIGNATURES = [
  "photo-1743756618181-99a77edf8eab",
  "photo-1584269408084-df3446157c9b",
  "photo-1679505833796-94daee5c20a0",
];

function isPlaceholderImageSrc(src: string) {
  return PLACEHOLDER_IMAGE_SIGNATURES.some((signature) => src.includes(signature));
}

export function EventCard({
  id,
  slug,
  nomEvent,
  dateEvent,
  image,
  bike_type,
  type_event,
  villeDepart,
  paysDepart,
  dateFin,
  distance,
  maxElevation,
  mint,
  variant = "carousel",
  carouselLayout = "default",
  isSelected = false,
  onEventClick,
  onEventHover,
}: EventCardProps) {
  const eventSlug = slug || makeLegacyEventSlug(id, nomEvent);
  const typeColor = getEventTypeColor(type_event);
  const name = nomEvent || "Événement";
  const normalizedImage = image?.trim() ?? "";
  const resolvedImage = getAppStorageImage(normalizedImage);
  const displayImage = resolvedImage?.src ?? "";
  const imageUnoptimized = resolvedImage?.unoptimized ?? true;
  const hasUsableImageValue =
    normalizedImage.length > 0 &&
    normalizedImage.toLowerCase() !== "null" &&
    normalizedImage.toLowerCase() !== "undefined" &&
    !isPlaceholderImageSrc(normalizedImage);
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const [loadedImageSrc, setLoadedImageSrc] = useState<string | null>(null);
  const hasImage = hasUsableImageValue && failedImageSrc !== displayImage;
  const imageLoaded = loadedImageSrc === displayImage;

  // Mois en toutes lettres, comme sur la carte du prototype : la ligne
  // « ville · date » est tronquée si besoin, mais elle se lit d'abord.
  const formattedStartDate = formatDateValue(dateEvent, "fr-FR", {
    day: "numeric",
    month: "long",
  });
  const formattedEndDate = formatDateValue(dateFin, "fr-FR", {
    day: "numeric",
    month: "long",
  });
  const formattedDate =
    formattedStartDate && formattedEndDate && getDateKey(dateEvent) !== getDateKey(dateFin)
      ? `${formattedStartDate} - ${formattedEndDate}`
      : formattedStartDate;
  const past = isEventPast({ dateEvent, dateFin });

  const location = [villeDepart, paysDepart].filter(Boolean).join(", ");
  const factTags = getEventFactTags({ dateEvent, dateFin, distance, maxElevation });

  const trackLinkOpen = () => {
    trackAnalyticsEvent("Event Opened", {
      event_id: id,
      source: variant,
      event_type: type_event,
      bike_type,
    });
  };

  // Dégradé de repli, affiché tant que la photo n'est pas chargée et quand il
  // n'y en a pas : la couleur porte le type d'évènement. Le nom n'y est pas
  // répété — il est déjà posé sur la tuile, en blanc.
  const fallbackBackground = {
    backgroundImage: `radial-gradient(circle at top left, ${typeColor}55, transparent 35%), linear-gradient(140deg, ${typeColor}, ${typeColor}bb)`,
  };

  if (variant === "compact") {
    const content = (
      <>
        <div
          className="relative h-14 w-[76px] flex-none overflow-hidden rounded-[var(--radius-sm)] sm:h-[56px]"
          style={fallbackBackground}
        >
          {hasImage && (
            <Image
              src={displayImage}
              alt={name}
              fill
              unoptimized={imageUnoptimized}
              className={`object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              sizes="76px"
              onError={() => setFailedImageSrc(displayImage)}
              onLoad={() => setLoadedImageSrc(displayImage)}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold leading-snug text-foreground">
            {name}
          </div>
          <div className="mt-0.5 truncate text-[13px] text-foreground/55">
            {[formattedDate || "À venir", location].filter(Boolean).join(" · ")}
          </div>
        </div>
      </>
    );

    const className =
      "flex items-center gap-3.5 rounded-[var(--radius-md)] border border-white/50 bg-white/50 p-3 transition-colors hover:bg-white/85";

    if (onEventClick) {
      return (
        <button type="button" className={`${className} text-left`} onClick={() => onEventClick(id)}>
          {content}
        </button>
      );
    }

    return (
      <Link href={`/event/${eventSlug}`} className={className} onClick={trackLinkOpen}>
        {content}
      </Link>
    );
  }

  // ---- Tuile photo (carousel + list) ---------------------------------------
  // Une seule information dominante : le titre, en blanc sur la photo. Les
  // repères (mixité, durée, distance · dénivelé) sont posés au-dessus, la
  // ville et la date en dessous.
  const tile = (
    <>
      <div className="absolute inset-0" style={fallbackBackground} />
      {hasImage && (
        <Image
          src={displayImage}
          alt={name}
          fill
          unoptimized={imageUnoptimized}
          className={`object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          sizes={variant === "list" ? "(max-width: 1024px) 100vw, 420px" : "320px"}
          onError={() => setFailedImageSrc(displayImage)}
          onLoad={() => setLoadedImageSrc(displayImage)}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_20%,rgba(0,0,0,0.5)_55%,rgba(0,0,0,0.88)_100%)]" />

      <div className="absolute right-2.5 top-2.5 z-20">
        <FavouriteButton eventId={id} />
      </div>

      <div className="relative z-10 mt-auto p-3.5">
        {(mint || past || factTags.length > 0) && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {mint && (
              <MixiteBadge className="px-2 py-[3px] text-[10px] font-normal tracking-[0.04em]" />
            )}
            {past && (
              <span className="rounded-full border border-white/35 bg-foreground/62 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-sm">
                Terminé
              </span>
            )}
            {factTags.map((fact) => (
              <span
                key={fact}
                className="rounded-full bg-white/90 px-2 py-[3px] text-[10px] uppercase tracking-[0.04em] text-foreground"
              >
                {fact}
              </span>
            ))}
          </div>
        )}
        <h3 className="line-clamp-2 font-serif text-[24px] font-bold leading-[1.05] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.28)]">
          {name}
        </h3>
        <div className="mt-1 truncate text-[13px] text-white/85">
          {[location || "Lieu à confirmer", formattedDate].filter(Boolean).join(" · ")}
        </div>
      </div>
    </>
  );

  const sizeClassName =
    variant === "list"
      ? "h-[220px] w-full"
      : carouselLayout === "map-preview"
        ? "h-[280px] w-[calc(100vw-4.75rem)] max-w-[520px] flex-none snap-start md:w-[260px]"
        : "h-[280px] w-[260px] flex-none snap-start";

  const className = `group relative flex flex-col justify-end overflow-hidden rounded-[var(--radius-md)] text-white shadow-[var(--shadow-sm)] transition-all duration-300 hover:shadow-[var(--shadow-md)] ${sizeClassName} ${
    isSelected ? "ring-2 ring-coral/55 ring-offset-2 ring-offset-transparent" : ""
  } ${past ? "opacity-[0.78] hover:opacity-100" : ""}`;

  if (onEventClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={`${className} cursor-pointer`}
        onClick={() => onEventClick(id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEventClick(id);
        }}
        onMouseEnter={() => onEventHover?.(id)}
        onMouseLeave={() => onEventHover?.(null)}
      >
        {tile}
      </div>
    );
  }

  return (
    <Link
      href={`/event/${eventSlug}`}
      className={className}
      onClick={trackLinkOpen}
      onMouseEnter={() => onEventHover?.(id)}
      onMouseLeave={() => onEventHover?.(null)}
    >
      {tile}
    </Link>
  );
}
