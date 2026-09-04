import type { createClient } from "@/lib/supabase/server";

/**
 * Ce que l'organisation met en place à l'inscription pour les femmes et
 * minorités de genre : des délais allongés, des places réservées.
 *
 * Ce ne sont pas des mesures du catalogue `inclusion_measures` — celui-ci porte
 * des libellés partagés entre évènements, rattachés par une liaison. Ici, la
 * base ne porte que le fait, propre à un évènement, et il s'affiche là où il
 * sert : avec la date d'ouverture des inscriptions, pas dans le bloc vert.
 */
export interface EventRegistrationMeasures {
  /** Délais d'inscription allongés pour les femmes et minorités de genre. */
  extendedDeadline: boolean;
  /** Places réservées aux femmes et minorités de genre. */
  reservedSpots: boolean;
}

export const NO_REGISTRATION_MEASURES: EventRegistrationMeasures = {
  extendedDeadline: false,
  reservedSpots: false,
};

/**
 * Lecture publique : la fiche est rendue avec la clé publique et reste
 * consultable sans compte.
 *
 * Pas de ligne — le cas courant, tant que rien n'est saisi — vaut « aucune
 * disposition connue », comme une erreur de lecture : ces deux lignes sont un
 * bonus dans la timeline, leur absence ne doit pas faire tomber la fiche.
 */
export async function fetchEventRegistrationMeasures(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: number
): Promise<EventRegistrationMeasures> {
  const { data, error } = await supabase
    .from("event_registration_measures")
    .select("extended_deadline, reserved_spots")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error || !data) return NO_REGISTRATION_MEASURES;

  return {
    extendedDeadline: data.extended_deadline === true,
    reservedSpots: data.reserved_spots === true,
  };
}
