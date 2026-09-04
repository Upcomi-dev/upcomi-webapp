import { cn } from "@/lib/utils";

/**
 * Les « petites têtes » de la fiche évènement.
 *
 * Ce sont des **portraits d'illustration**, pas les personnes intéressées :
 * `user_public.avatar_url` est vide dans l'immense majorité des cas, et une
 * rangée de pastilles à initiales ne dit pas « il y a du monde ». Mêmes
 * portraits que le prototype (randomuser.me), rapatriés dans `public/` pour ne
 * pas dépendre d'un domaine tiers au rendu.
 *
 * Deux femmes et un homme, dans cet ordre : c'est la proportion de la
 * communauté, et c'est ce que la pile doit donner à voir en un coup d'œil.
 */
const PLACEHOLDER_AVATARS = [
  "/avatars/placeholder-1.jpg",
  "/avatars/placeholder-2.jpg",
  "/avatars/placeholder-3.jpg",
];

/**
 * La pile est une **décoration**, pas un décompte : elle montre les mêmes trois
 * portraits quel que soit le nombre de personnes. Elle ne décide donc pas
 * elle-même de s'afficher — c'est à l'appelant de savoir si un visage a un sens
 * à cet endroit (la ligne d'arrivée du chemin en a toujours un ; un compteur à
 * zéro, non).
 */
export function AvatarStack({
  size = 26,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex w-max flex-none items-center", className)} aria-hidden>
      {PLACEHOLDER_AVATARS.map((src, index) => (
        // Illustration décorative : `aria-hidden` sur la pile, `alt` vide.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          width={size}
          height={size}
          className={cn(
            "flex-none rounded-full border-2 border-white bg-white/35 object-cover shadow-[0_2px_6px_rgba(36,23,15,0.18)]",
            index > 0 && "-ml-[9px]"
          )}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}
