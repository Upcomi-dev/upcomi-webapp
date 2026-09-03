import { cn } from "@/lib/utils";

interface MixiteBadgeProps {
  className?: string;
}

/**
 * Pastille « mixité choisie ».
 *
 * Même forme et même typographie que les autres repères posés à côté d'elle
 * (durée, distance · dénivelé) — seule la couleur la distingue, en vert
 * inclusion plein. C'est un repère parmi les autres, pas une décoration à
 * part : les contextes qui l'affichent dans une taille différente passent
 * leur propre `className`.
 */
export function MixiteBadge({ className }: MixiteBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full bg-[#4e9c6b] px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.06em] text-white",
        className
      )}
    >
      Mixité choisie
    </span>
  );
}
