"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getPersonCity,
  getPersonDisplayName,
  getPersonLevelLabel,
  type InterestedPerson,
} from "@/lib/events/interested-people";

/**
 * La feuille « qui est intéressé ». Une ligne par personne : son nom, puis sa
 * ville et son niveau quand ils sont déclarés.
 *
 * Pas de portrait ici, comme dans le prototype : les visages de la fiche sont
 * des illustrations (voir `person-avatar.tsx`), et en coller un à côté d'un nom
 * réel donnerait un visage à quelqu'un qui n'en a pas.
 *
 * Le prototype ajoute un bouton « Suivre » : il n'est pas repris, suivre
 * quelqu'un relève de `feat/social`. La ligne secondaire porte donc
 * « ville · niveau » — deux repères pour se situer, aucun geste à faire.
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
            {people.map((person) => {
              const city = getPersonCity(person);
              const level = getPersonLevelLabel(person);
              // Ville et niveau sont l'un et l'autre facultatifs : la ligne
              // secondaire ne s'affiche qu'avec ce qui existe, et disparaît
              // quand il n'y a ni l'un ni l'autre.
              const details = [city, level ? `pratique ${level}` : null].filter(Boolean);

              return (
                <div key={person.uid} className="border-b border-black/6 py-3 last:border-b-0">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {getPersonDisplayName(person)}
                  </div>
                  {details.length > 0 && (
                    <div className="mt-0.5 text-[13px] text-muted-foreground">
                      {details.join(" · ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
