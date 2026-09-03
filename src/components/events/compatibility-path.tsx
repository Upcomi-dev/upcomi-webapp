"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { AvatarStack } from "@/components/events/person-avatar";
import type { InterestedPerson } from "@/lib/events/interested-people";

/**
 * Le « chemin » entre moi et les personnes déjà intéressées : une piste, un
 * personnage qui avance au fil des réponses, et les têtes de celles qui sont
 * déjà là au bout.
 *
 * C'est la promesse du bloc, et la raison pour laquelle le questionnaire n'est
 * pas un test : on ne note pas l'évènement, on se situe.
 */

/** Jamais tout à fait au départ ni tout à fait à l'arrivée : la piste doit rester lisible. */
export function pathPercent(overall: number | null): number {
  const value = overall ?? 0;
  return Math.max(3, Math.min(97, Math.round((value / 10) * 100)));
}

export function CompatibilityPath({
  overall,
  people,
}: {
  overall: number | null;
  people: InterestedPerson[];
}) {
  const target = pathPercent(overall);
  // Le personnage part toujours de sa position précédente : monté directement
  // à sa cible, il n'y aurait pas de trajet à voir. Le premier rendu le pose
  // au départ, l'effet le lance au frame suivant.
  const [displayed, setDisplayed] = useState(3);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplayed(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <div className="mb-4">
      <div className="relative mx-1.5 mt-4 mb-2 h-1.5 rounded-full bg-white/25">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white transition-[width] duration-700 ease-out"
          style={{ width: `${displayed}%` }}
        />
        <div
          className="absolute top-1/2 flex h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-violet-dark shadow-[0_2px_6px_rgba(36,23,15,0.18)] transition-[left] duration-700 ease-out"
          style={{ left: `${displayed}%` }}
          title="Toi"
        >
          <User className="h-3 w-3" strokeWidth={2.2} />
        </div>
        <div className="absolute top-1/2 left-full -translate-x-1/2 -translate-y-1/2">
          {people.length > 0 ? (
            <AvatarStack people={people} max={3} />
          ) : (
            // Personne encore : un point d'arrivée quand même, sinon la piste
            // n'a plus de but et le trajet ne veut plus rien dire.
            <span className="block h-[26px] w-[26px] rounded-full border border-white/40 bg-white/20" />
          )}
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-white/75">
        <span>Toi</span>
        <span className="max-w-[60%] text-right">Les intéressé·es</span>
      </div>
    </div>
  );
}
