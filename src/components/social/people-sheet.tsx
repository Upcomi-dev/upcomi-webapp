"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FollowButton } from "@/components/social/follow-button";

/**
 * Une ligne de la feuille, une fois réduite à ce que l'affichage a besoin de
 * savoir. Chaque appelant construit ses lignes à partir de son propre modèle
 * (`InterestedPerson` de `lib/events/interested-people`, `MockPerson` de
 * `lib/social/mock-social`…) : la feuille elle-même ne connaît qu'un id, un
 * nom et un sous-titre facultatif.
 */
export interface PeopleSheetRow {
  id: string;
  name: string;
  subtitle: string | null;
  isPrivate?: boolean;
}

/**
 * La feuille « liste de personnes », partagée par les deux endroits qui en ont
 * besoin : « qui est intéressé » sur une fiche évènement et « abonné·es » /
 * « abonnements » sur un profil. Les deux listes ne viennent pas des mêmes
 * données — uid réel de `user_public` d'un côté, fixtures de `mock-social` de
 * l'autre — mais elles se présentent de la même façon : un nom cliquable vers
 * le profil, un sous-titre facultatif, un bouton Suivre à droite.
 *
 * Pas de portrait : les visages posés sur la fiche évènement sont des
 * illustrations (voir `events/person-avatar.tsx`), et en coller un à côté d'un
 * nom réel donnerait un visage à quelqu'un qui n'en a pas.
 *
 * MAQUETTE : le suivi n'est pas persisté et `friendships` n'a aujourd'hui
 * aucune policy d'écriture. Voir `lib/social/mock-social`. Le profil, lui,
 * n'existe qu'en dur pour les fixtures de `mock-social` : un `id` réel qui n'y
 * figure pas tombera en 404 tant que `/profil/[id]` ne lit pas `user_public`
 * (voir « Le profil privé n'existe pas » dans `docs/upcomi-v2.md`).
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
  people: PeopleSheetRow[];
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
                key={person.id}
                className="flex items-center gap-3 border-b border-black/6 py-3 last:border-b-0"
              >
                <Link
                  href={`/profil/${person.id}`}
                  onClick={() => onOpenChange(false)}
                  className="min-w-0 flex-1 no-underline"
                >
                  <div className="truncate text-sm font-semibold text-foreground">
                    {person.name}
                  </div>
                  {person.subtitle && (
                    <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
                      {person.subtitle}
                    </div>
                  )}
                </Link>
                <FollowButton
                  personId={person.id}
                  personName={person.name}
                  isPrivate={person.isPrivate}
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
