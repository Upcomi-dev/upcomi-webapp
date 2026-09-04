"use client";

import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { Button } from "@/components/ui/button";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { EventPromoCode } from "@/lib/events/promo-code";
import { cn } from "@/lib/utils";

/**
 * Le code promo réservé aux membres, en bandeau pleine largeur en haut de
 * fiche — entre la ligne de synthèse et le bloc d'intérêt.
 *
 * Aplat plein de la couleur principale Upcomi (le corail des boutons, pas
 * l'ocre `--orange`), pas le fond clair des autres blocs : c'est un avantage
 * à part, pas une info logistique de plus, et il doit se voir. Bleed
 * horizontal jusqu'aux bords du conteneur de page (marges négatives
 * compensant son padding) plutôt qu'inséré avec les mêmes marges que le
 * reste du contenu.
 *
 * Le bouton fond blanc / texte corail est une exception assumée à la palette
 * de boutons de l'appli — sur un aplat de couleur, un bouton à la charte
 * habituelle (fond corail) se fondrait dans le bandeau.
 *
 * Sans compte, le code n'est pas dans la page : la table ne l'accorde pas à
 * `anon` (voir `lib/events/promo-code.ts`). C'est le gate d'inscription
 * habituel qui prend sa place, avec le geste en titre.
 */
export function EventPromoCode({
  eventId,
  promo,
  className,
}: {
  eventId: number;
  promo: EventPromoCode;
  className?: string;
}) {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  // Rien à annoncer tant qu'aucun code n'est saisi : contrairement au bloc des
  // mesures d'inclusion, l'absence d'avantage n'est pas une information.
  if (!promo.exists) return null;

  const handleClick = () => {
    trackAnalyticsEvent("Promo Code Gate Opened", { event_id: eventId });
    openAuthModal({ title: "Rejoins la communauté Upcomi pour obtenir les codes promo" });
  };

  return (
    <section
      className={cn(
        "-mx-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 bg-primary px-4 py-3.5 text-white md:-mx-6 md:px-6",
        className
      )}
    >
      <p className="min-w-0 text-[15px] leading-snug">
        Profite du code promo exclusif réservé aux membres
      </p>

      {user && promo.code ? (
        <span className="rounded-full bg-white px-3.5 py-1.5 text-[15px] font-bold tracking-[0.08em] text-primary">
          {promo.code}
        </span>
      ) : (
        <Button
          type="button"
          onClick={handleClick}
          className="rounded-full bg-white px-3.5 text-primary hover:bg-white/90"
        >
          Voir le code promo
        </Button>
      )}
    </section>
  );
}
