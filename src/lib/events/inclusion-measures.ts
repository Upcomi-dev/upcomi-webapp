import type { createClient } from "@/lib/supabase/server";

export type InclusionMeasureGroup = "avant" | "pendant" | "apres";

export interface InclusionMeasure {
  id: string;
  label: string;
  description: string;
  measure_group: InclusionMeasureGroup;
  icon: string;
  position: number;
}

export const INCLUSION_MEASURE_GROUPS: {
  id: InclusionMeasureGroup;
  label: string;
}[] = [
  { id: "avant", label: "Avant l'évènement" },
  { id: "pendant", label: "Pendant l'évènement" },
  { id: "apres", label: "Après l'évènement" },
];

/**
 * Au-delà de ce nombre, la liste est repliée derrière un « Voir tout » : une
 * organisation peut cumuler beaucoup de mesures, et le catalogue n'est pas
 * plafonné.
 */
export const INCLUSION_MEASURES_COLLAPSE_AT = 10;

/**
 * Mesures d'inclusion rattachées à un évènement, triées par groupe puis par
 * position du catalogue.
 *
 * Une erreur de lecture est traitée comme « aucune mesure connue » : le bloc a
 * un état vide légitime, il n'y a pas de raison de faire tomber la fiche.
 */
export async function fetchEventInclusionMeasures(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: number
): Promise<InclusionMeasure[]> {
  const { data, error } = await supabase
    .from("event_inclusion_measures")
    .select("inclusion_measures(id, label, description, measure_group, icon, position)")
    .eq("event_id", eventId);

  if (error || !data) return [];

  // La jointure remonte typée en tableau côté supabase-js, alors que la clé
  // primaire de `inclusion_measures` garantit au plus une ligne : on accepte
  // les deux formes plutôt que de forcer le type.
  const measures = data
    .flatMap((row) => {
      const joined = (row as { inclusion_measures: InclusionMeasure | InclusionMeasure[] | null })
        .inclusion_measures;
      if (!joined) return [];
      return Array.isArray(joined) ? joined : [joined];
    })
    .filter((measure) =>
      INCLUSION_MEASURE_GROUPS.some((group) => group.id === measure.measure_group)
    );

  const groupOrder = new Map(
    INCLUSION_MEASURE_GROUPS.map((group, index) => [group.id, index])
  );

  return measures.sort((a, b) => {
    const groupDelta =
      (groupOrder.get(a.measure_group) ?? 0) - (groupOrder.get(b.measure_group) ?? 0);
    return groupDelta !== 0 ? groupDelta : a.position - b.position;
  });
}

/** Lien de signalement d'une mesure manquante : un vrai message, pas un formulaire à cocher. */
export function buildAddMeasureMailto(eventName: string): string {
  const subject = `Mesure pour ${eventName}`;
  const body = `Bonjour,\n\nJe voulais signaler que ${eventName} met en place :\n(décris la mesure ici)\n`;
  return `mailto:contact@upcomi.cc?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}
