import { cn } from "@/lib/utils";
import {
  getPersonDisplayName,
  getPersonInitials,
  type InterestedPerson,
} from "@/lib/events/interested-people";

/**
 * Une tête, et son repli. Le prototype pioche dans un jeu de faux portraits ;
 * ici les avatars sont réels et le plus souvent **absents** — les initiales
 * sur fond ocre sont donc le cas courant, pas l'exception. Même traitement que
 * la pastille de l'organisateur sur la fiche.
 */
export function PersonAvatar({
  person,
  size = 26,
  className,
}: {
  person: InterestedPerson;
  size?: number;
  className?: string;
}) {
  const common = cn(
    "flex flex-none items-center justify-center rounded-full border-2 border-white bg-orange/25 object-cover shadow-[0_2px_6px_rgba(36,23,15,0.18)]",
    className
  );
  const style = { width: size, height: size };

  if (person.avatarUrl) {
    return (
      // Avatars hébergés hors du domaine (Supabase storage, Google) : `img`
      // plutôt que `next/image`, qui exigerait de déclarer chaque hôte.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatarUrl}
        alt={getPersonDisplayName(person)}
        className={common}
        style={style}
      />
    );
  }

  return (
    <span
      className={cn(common, "font-bold text-orange-dark")}
      style={{ ...style, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {getPersonInitials(person)}
    </span>
  );
}

/**
 * Pile de têtes en léger chevauchement, partagée par le bloc « qui est
 * intéressé » du haut de fiche et l'arrivée du chemin d'adéquation.
 */
export function AvatarStack({
  people,
  max = 3,
  size = 26,
  className,
}: {
  people: InterestedPerson[];
  max?: number;
  size?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  if (shown.length === 0) return null;

  return (
    <div className={cn("flex w-max flex-none items-center", className)}>
      {shown.map((person, index) => (
        <PersonAvatar
          key={person.uid}
          person={person}
          size={size}
          className={index === 0 ? undefined : "-ml-[9px]"}
        />
      ))}
    </div>
  );
}
