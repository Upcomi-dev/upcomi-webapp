"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonRow } from "@/components/social/person-row";
import type { MockPerson } from "@/lib/social/mock-social";

/**
 * La feuille « abonné·es » / « abonnements », ouverte depuis les compteurs du
 * profil. Même feuille que « qui est intéressé » (voir
 * `events/people-sheet.tsx`), à ceci près qu'elle liste des personnes du
 * réseau et non les intéressé·es d'un évènement, et qu'on peut suivre depuis
 * chaque ligne.
 *
 * Les deux ne sont pas fusionnées : elles ne lisent pas la même chose
 * (`favourite_events` d'un côté, `friendships` de l'autre) et n'auront pas la
 * même requête au branchement. Ce qu'elles partagent est la ligne, et c'est
 * `PersonRow` qui la porte.
 */
export function SocialPeopleSheet({
  open,
  onOpenChange,
  title,
  people,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  people: MockPerson[];
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
              <PersonRow
                key={person.id}
                person={person}
                onNavigate={() => onOpenChange(false)}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
