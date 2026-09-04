"use client";

import Link from "next/link";
import { FollowButton } from "@/components/social/follow-button";
import {
  getPersonFullName,
  getPersonInitials,
  type MockPerson,
} from "@/lib/social/mock-social";

/**
 * Une ligne de personne : initiales, nom, « ville · pratique », bouton de
 * suivi. Partagée par la feuille des abonné·es, celle des abonnements et la
 * recherche d'ami·es — trois écrans qui listaient chacun sa version dans le
 * prototype.
 *
 * Pas de portrait : les visages posés sur la fiche évènement sont des
 * illustrations (voir `events/person-avatar.tsx`), et en coller un à côté d'un
 * nom réel donnerait un visage à quelqu'un qui n'en a pas. Les initiales
 * suffisent à distinguer deux lignes.
 */
export function PersonRow({
  person,
  onNavigate,
}: {
  person: MockPerson;
  /** Appelé avant la navigation, pour refermer la feuille qui contient la ligne. */
  onNavigate?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-black/6 py-3 last:border-b-0">
      <Link
        href={`/profil/${person.id}`}
        onClick={onNavigate}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-orange/30 bg-orange/20 text-[13px] font-bold text-orange-dark"
        aria-hidden="true"
        tabIndex={-1}
      >
        {getPersonInitials(person)}
      </Link>
      <Link
        href={`/profil/${person.id}`}
        onClick={onNavigate}
        className="min-w-0 flex-1 no-underline"
      >
        <div className="truncate text-sm font-semibold text-foreground">
          {getPersonFullName(person)}
        </div>
        <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {[person.city, person.practice].filter(Boolean).join(" · ")}
        </div>
      </Link>
      <FollowButton
        personId={person.id}
        personName={getPersonFullName(person)}
        isPrivate={person.isPrivate}
      />
    </div>
  );
}
