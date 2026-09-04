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
 * « X personnes intéressées », avec ses visages.
 *
 * Le même bloc aux trois endroits du prototype : en haut de fiche au-dessus des
 * actions, dans la barre collante en mobile, et dans la colonne de droite en
 * desktop. Partout il ouvre la même feuille — la liste complète des personnes
 * intéressées, jamais une sélection.
 */
export function InterestedBlock({
  eventId,
  eventName,
  className,
  size = "default",
}: {
  eventId: number;
  eventName: string;
  className?: string;
  /** `compact` pour la barre collante et la colonne de droite, plus étroites. */
  size?: "default" | "compact";
}) {
  const { count, people } = useInterestedPeople();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [sheetOpen, setSheetOpen] = useState(false);

  const label =
    count > 0
      ? `${count} personne${count > 1 ? "s" : ""} intéressée${count > 1 ? "s" : ""}`
      : "Sois la première personne à t'intéresser à cet évènement";

  const handleClick = () => {
    if (count === 0) return;

    if (!user) {
      trackAnalyticsEvent("Interested People Opened", {
        event_id: eventId,
        authenticated: false,
      });
      openAuthModal({
        title: "Rejoins la communauté Upcomi pour voir qui est déjà intéressé·e",
      });
      return;
    }

    trackAnalyticsEvent("Interested People Opened", { event_id: eventId, authenticated: true });
    setSheetOpen(true);
  };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <AvatarStack count={count} size={size === "compact" ? 22 : 26} />
      <button
        type="button"
        onClick={handleClick}
        disabled={count === 0}
        className={cn(
          "min-w-0 text-left font-semibold text-foreground underline decoration-from-font underline-offset-[3px] disabled:cursor-default disabled:font-normal disabled:text-muted-foreground disabled:no-underline",
          size === "compact" ? "text-[13px]" : "text-sm"
        )}
      >
        {label}
      </button>

      {/* Titre sans chiffre : la liste ne montre que les autres, et un nombre
          en titre se lirait comme une promesse de lignes à compter. Le compte
          est déjà sur le bouton qui vient d'ouvrir la feuille. */}
      <PeopleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={`Qui est intéressée par ${eventName} ?`}
        people={people}
      />
    </div>
  );
}
