"use client";

import { Ticket } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { EventPromoCode } from "@/lib/events/promo-code";
import { cn } from "@/lib/utils";

/**
 * Le code promo réservé aux membres, en bandeau pleine largeur en haut de
 * fiche — entre la ligne de synthèse et le bloc d'intérêt.
 *
 * Une seule couleur, l'ocre de la charte : la fiche a déjà le corail des
 * actions et le vert des mesures d'inclusion, et un avantage membre n'est ni
 * l'un ni l'autre. Fond clair plutôt qu'aplat plein — le bandeau est au-dessus
 * des boutons d'inscription, il ne doit pas leur passer devant.
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
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5",
        "rounded-[var(--radius-md)] bg-orange-light px-4 py-3.5 text-orange-dark",
        className
      )}
    >
      <p className="flex min-w-0 items-center gap-2.5 text-[15px] leading-snug">
        <Ticket className="h-[18px] w-[18px] flex-none" strokeWidth={1.8} aria-hidden />
        Profite du code promo exclusif réservé aux membres
      </p>

      {user && promo.code ? (
        <span className="rounded-full bg-white/70 px-3.5 py-1.5 text-[15px] font-bold tracking-[0.08em]">
          {promo.code}
        </span>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="rounded-full bg-white/70 px-3.5 py-1.5 text-sm font-bold transition-colors hover:bg-white"
        >
          Créer un compte
        </button>
      )}
    </section>
  );
}
