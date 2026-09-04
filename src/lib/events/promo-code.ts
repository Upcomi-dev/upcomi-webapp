import type { createClient } from "@/lib/supabase/server";

/**
 * Le code promo réservé aux membres Upcomi.
 *
 * La promesse « exclusif, réservé aux membres » est tenue par la base et non
 * par l'interface : `event_promo_codes` n'accorde aucun droit à `anon`, et la
 * clé publique est dans le navigateur de tout le monde. Masquer le code côté
 * rendu tout en l'envoyant dans la page reviendrait à le publier.
 */
export interface EventPromoCode {
  /** Le code, `null` quand il existe mais qu'on n'a pas de compte pour le lire. */
  code: string | null;
  /** Vrai dès qu'un code existe, avec ou sans compte : c'est ce qui autorise le bloc. */
  exists: boolean;
}

export const NO_PROMO_CODE: EventPromoCode = { code: null, exists: false };

/**
 * Une seule lecture, deux réponses selon qui regarde.
 *
 * Connectée, la table répond directement. Déconnectée, la requête échoue
 * faute de droits — c'est attendu — et on retombe sur `has_event_promo_code()`,
 * exécutable par `anon`, qui dit qu'un code existe sans jamais le donner. Sans
 * elle, une visiteuse ne verrait rien du tout et le bloc ne pourrait pas
 * l'inviter à créer un compte.
 */
export async function fetchEventPromoCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: number
): Promise<EventPromoCode> {
  const { data, error } = await supabase
    .from("event_promo_codes")
    .select("code")
    .eq("event_id", eventId)
    .maybeSingle();

  const code = !error && data ? data.code?.trim() || null : null;
  if (code) return { code, exists: true };

  const { data: exists } = await supabase.rpc("has_event_promo_code", {
    p_event_id: eventId,
  });

  return { code: null, exists: exists === true };
}
