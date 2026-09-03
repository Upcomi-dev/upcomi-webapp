"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { AvatarStack } from "@/components/events/person-avatar";
import { PeopleSheet } from "@/components/events/people-sheet";
import { useInterestedPeople } from "@/components/events/interested-people-context";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * « Qui est intéressé », en haut de fiche.
 *
 * Le prototype l'a remonté du bas de page : l'intérêt social se montre tout de
 * suite, plutôt que caché sous les actions. Le compteur est cliquable et ouvre
 * la feuille de personnes ; déconnectée, il ouvre le gate — on peut savoir
 * combien elles sont sans avoir de compte, pas qui elles sont.
 */
export function InterestedBlock({
  eventId,
  eventName,
  className,
}: {
  eventId: number;
  eventName: string;
  className?: string;
}) {
  const { count, people } = useInterestedPeople();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [sheetOpen, setSheetOpen] = useState(false);

  const label =
    count > 0
      ? `${count} personne${count > 1 ? "s" : ""} intéressée${count > 1 ? "s" : ""}`
      : "Sois la première à t'intéresser à cet évènement";

  const handleClick = () => {
    if (count === 0) return;

    if (!user) {
      trackAnalyticsEvent("Interested People Opened", {
        event_id: eventId,
        authenticated: false,
      });
      openAuthModal({
        title: "Rejoins la communauté Upcomi pour voir qui est déjà intéressé·e",
        redirect: `/event/${eventId}`,
      });
      return;
    }

    trackAnalyticsEvent("Interested People Opened", { event_id: eventId, authenticated: true });
    setSheetOpen(true);
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {people.length > 0 && <AvatarStack people={people} max={3} />}
      <button
        type="button"
        onClick={handleClick}
        disabled={count === 0}
        className="text-left text-sm font-semibold text-foreground underline decoration-from-font underline-offset-[3px] disabled:cursor-default disabled:font-normal disabled:text-muted-foreground disabled:no-underline"
      >
        {label}
      </button>

      {/* Titre sans chiffre : la liste ne montre que les **autres**, et un
          nombre en titre se lirait comme une promesse de lignes à compter. Le
          compte est déjà sur le bouton qui vient d'ouvrir la feuille. */}
      <PeopleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={`Qui est intéressé·e par ${eventName} ?`}
        people={people}
      />
    </div>
  );
}
