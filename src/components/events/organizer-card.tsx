import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getAppStorageImage } from "@/lib/storage/urls";
import { getOrganizerProfile } from "@/lib/events/organizer-profile";

/**
 * L'identité de l'organisation, en tête du bloc « Qui organise ? ».
 *
 * Ne rend que l'identité : les mesures d'inclusion et « Leurs autres
 * évènements » restent posées par la page, dans la même carte, sous ce
 * composant. C'est volontaire — ces deux blocs ont leur propre brique, et les
 * absorber ici rendrait chaque merge plus douloureux qu'il n'a besoin de
 * l'être.
 *
 * Trois évolutions par rapport à ce qui est en production : le logo (avec les
 * initiales en repli, comme avant), une description en clair, et les comptes
 * Instagram et Strava aux côtés du site.
 *
 * MAQUETTE : description et réseaux sont en dur (voir
 * `lib/events/organizer-profile`). Seuls le nom et le site sont réels.
 */
export function OrganizerCard({
  organizer,
  websiteUrl,
}: {
  organizer: string | null;
  websiteUrl: string | null;
}) {
  if (!organizer) {
    return (
      <p className="text-sm text-foreground/55">
        L&apos;organisation de cet évènement n&apos;est pas encore renseignée.
      </p>
    );
  }

  const profile = getOrganizerProfile(organizer, websiteUrl);
  const logo = getAppStorageImage(profile.image);
  const links = [
    { label: "Voir le site", href: profile.websiteUrl },
    { label: "Instagram", href: profile.instagramUrl },
    { label: "Strava", href: profile.stravaUrl },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));

  return (
    <div>
      {/* Le nom passe sur la même ligne que le logo, les liens sur la leur.
          En production ils partagent la ligne, ce qui tenait tant qu'il n'y
          avait qu'un bouton ; à trois, le nom finissait écrasé. */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-orange/30 bg-orange/20 text-sm font-bold text-orange-dark">
          {logo ? (
            <Image
              src={logo.src}
              alt=""
              fill
              sizes="44px"
              className="object-cover"
              unoptimized={logo.unoptimized}
            />
          ) : (
            profile.name.substring(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1 text-sm font-semibold text-foreground">
          {profile.name}
        </div>
      </div>

      {profile.description && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/70">
          {profile.description}
        </p>
      )}

      {links.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary btn-small flex-none"
            >
              {link.label}
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
