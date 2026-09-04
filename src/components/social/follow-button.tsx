"use client";

import { Check } from "lucide-react";
import { useFollow } from "@/components/social/follow-context";

/**
 * « Suivre » / « Ne plus suivre ».
 *
 * Prend un identifiant et un nom, pas une personne : le bouton sert aussi bien
 * aux profils en dur de la maquette qu'aux vraies personnes de la feuille
 * « qui est intéressé », qui viennent, elles, de `user_public`. Au branchement
 * il n'y aura qu'un type de personne et la question ne se posera plus — d'ici
 * là, ne pas le coupler aux fixtures.
 *
 * Deux tailles pour deux contextes, jamais deux comportements :
 *
 * - `page` — l'action principale d'un profil consulté : plein tant qu'on ne
 *   suit pas, liseré une fois suivi. Ne plus suivre ne doit pas être le geste
 *   le plus visible de la page.
 * - `row` — dans une liste de personnes : petit bouton à liseré, `data-active`
 *   une fois suivi, exactement l'« état atteint » que la charte réserve à ça
 *   (voir `globals.css`, `.btn-secondary[data-active="true"]`).
 *
 * Sur un profil privé, suivre est une **demande** : le libellé le dit, et
 * l'action ne donne accès à rien tant qu'elle n'est pas acceptée. Le proto
 * pose ce cas, la base ne sait pas encore le porter — voir
 * `lib/social/mock-social`.
 */
export function FollowButton({
  personId,
  personName,
  isPrivate = false,
  variant = "row",
  className = "",
}: {
  personId: string;
  personName: string;
  isPrivate?: boolean;
  variant?: "page" | "row";
  className?: string;
}) {
  const { isFollowing, toggleFollow } = useFollow();
  const following = isFollowing(personId);
  const label = following ? `Ne plus suivre ${personName}` : `Suivre ${personName}`;

  if (variant === "page") {
    return (
      <button
        type="button"
        onClick={() => toggleFollow(personId)}
        className={`${following ? "btn-secondary" : "btn-primary"} ${className}`}
        data-active={following ? "true" : undefined}
        aria-label={label}
      >
        {following ? "Ne plus suivre" : isPrivate ? "Demander à suivre" : "Suivre"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggleFollow(personId)}
      className={`btn-secondary btn-small flex-none ${className}`}
      data-active={following ? "true" : undefined}
      aria-label={label}
    >
      {following ? (
        <>
          <Check className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
          Suivie
        </>
      ) : isPrivate ? (
        "Demander"
      ) : (
        "Suivre"
      )}
    </button>
  );
}
