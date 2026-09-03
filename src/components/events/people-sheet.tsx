"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPersonDisplayName, type InterestedPerson } from "@/lib/events/interested-people";
import { TIER_LABELS } from "@/lib/compatibility/levels";

/**
 * La feuille « qui est intéressé ». Une ligne par personne : son nom, et son
 * niveau quand il est déclaré.
 *
 * Pas de portrait ici, comme dans le prototype : les visages de la fiche sont
 * des illustrations (voir `person-avatar.tsx`), et en coller un à côté d'un nom
 * réel donnerait un visage à quelqu'un qui n'en a pas.
 *
 * Le prototype affiche `ville · type de vélo` et un bouton « Suivre ». Ni l'une
 * ni l'autre n'existent ici : la ville n'est pas dans `user_public` et suivre
 * quelqu'un relève de `feat/social`. Le niveau prend leur place — c'est
 * l'information que le bloc vient de servir à comparer.
 */
export function PeopleSheet({
  open,
  onOpenChange,
  title,
  people,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  people: InterestedPerson[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8 font-serif text-xl leading-tight">{title}</DialogTitle>
        </DialogHeader>

        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">Personne pour le moment.</p>
        ) : (
          <div className="flex flex-col">
            {people.map((person) => (
              <div
                key={person.uid}
                className="border-b border-black/6 py-3 last:border-b-0"
              >
                <div className="truncate text-sm font-semibold text-foreground">
                  {getPersonDisplayName(person)}
                </div>
                {person.tier !== null && (
                  <div className="mt-0.5 text-[13px] text-muted-foreground">
                    Pratique {TIER_LABELS[person.tier]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
