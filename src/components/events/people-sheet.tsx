"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonAvatar } from "@/components/events/person-avatar";
import {
  getPersonDisplayName,
  type InterestedPerson,
} from "@/lib/events/interested-people";
import { TIER_LABELS } from "@/lib/compatibility/levels";

/**
 * La feuille « qui est intéressé ». Une ligne par personne : sa tête, son nom,
 * et son niveau quand il est déclaré.
 *
 * Le prototype affiche `ville · type de vélo` et un bouton « Suivre ». Ni
 * l'une ni l'autre n'existent ici : la ville n'est pas dans `user_public` et
 * suivre quelqu'un relève de `feat/social`. Le niveau prend leur place — c'est
 * l'information que le bloc vient de servir à comparer.
 */
export function PeopleSheet({
  open,
  onOpenChange,
  title,
  people,
  totalCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  people: InterestedPerson[];
  /**
   * Le total, quand la liste est écourtée. Le titre annonce un nombre : sans
   * cette mention, on compte huit lignes sous un titre qui en promet dix.
   */
  totalCount?: number;
}) {
  const hidden = Math.max(0, (totalCount ?? people.length) - people.length);

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
                className="flex items-center gap-3 border-b border-black/6 py-3 last:border-b-0"
              >
                <PersonAvatar person={person} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {getPersonDisplayName(person)}
                  </div>
                  {person.tier !== null && (
                    <div className="mt-0.5 text-[13px] text-muted-foreground">
                      Pratique {TIER_LABELS[person.tier]}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {hidden > 0 && (
              <p className="pt-3 text-[13px] text-muted-foreground">
                et {hidden} autre{hidden > 1 ? "s" : ""} personne{hidden > 1 ? "s" : ""}.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
