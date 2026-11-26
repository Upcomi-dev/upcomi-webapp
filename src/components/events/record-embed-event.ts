"use server";

import { createClient } from "@/lib/supabase/server";

const EMBED_EVENT_KINDS = ["view", "start", "complete", "open", "arrival"] as const;

export type EmbedEventKind = (typeof EMBED_EVENT_KINDS)[number];

/**
 * Une étape du bloc embarqué chez un partenaire, comptée pour l'onglet
 * « Embeds » de /admin (table `embed_events`). Aucune donnée personnelle.
 *
 * Appelée depuis le navigateur d'un visiteur anonyme : tout est revalidé ici,
 * et un échec ne remonte jamais — le suivi ne doit pas gêner le bloc.
 */
export async function recordEmbedEvent(
  eventId: number,
  kind: EmbedEventKind,
  partner?: string
): Promise<void> {
  // Hors production (dev local branché sur la vraie base, prévisualisations)
  // on ne compte rien : les essais ne doivent pas se mêler aux vrais usages.
  if (process.env.VERCEL_ENV !== "production") return;
  if (!Number.isSafeInteger(eventId) || eventId <= 0) return;
  if (!EMBED_EVENT_KINDS.includes(kind)) return;

  try {
    const supabase = await createClient();
    await supabase.from("embed_events").insert({
      event_id: eventId,
      kind,
      partner: typeof partner === "string" && partner ? partner.slice(0, 120) : null,
    });
  } catch {
    // Le suivi ne doit jamais affecter l'expérience.
  }
}
