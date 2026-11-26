import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseLegacyEventId } from "@/lib/utils/slugify";
import type { Event } from "@/lib/types/database";

/**
 * Lecture par identifiant, pour les adresses qui doivent survivre à un
 * renommage ou à un changement de règle de slug (bloc embarqué chez un
 * partenaire) : l'id ne change jamais, le slug si.
 */
export const getEventById = cache(async (id: number) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("verifie", true)
    .maybeSingle();
  return { supabase, event: (data as Event | null) ?? null };
});

/**
 * Lecture de l'évènement partagée par le layout, `generateMetadata` et la page
 * (`cache` : une seule requête par rendu). Une ancienne adresse — slug d'avant
 * un renommage, ou ancien format `<id>-<nom>` — est résolue par id ; `isLegacy`
 * signale qu'il faut rediriger vers le slug canonique.
 */
export const getEventBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("verifie", true)
    .maybeSingle();

  if (data) return { supabase, event: data as Event, isLegacy: false };

  // Slug introuvable : c'est peut-être une ancienne adresse de la fiche
  // (renommée depuis — table `event_slug_history`, tenue par un trigger), ou
  // l'ancien format `<id>-<nom>`. Cette lecture ne coûte que sur ce chemin-là.
  const { data: former } = await supabase
    .from("event_slug_history")
    .select("event_id")
    .eq("slug", slug)
    .maybeSingle();
  const legacyId = (former as { event_id: number } | null)?.event_id ?? parseLegacyEventId(slug);
  if (legacyId == null) return { supabase, event: null, isLegacy: false };

  const { data: legacyEvent } = await supabase
    .from("events")
    .select("*")
    .eq("id", legacyId)
    .eq("verifie", true)
    .maybeSingle();

  // Sans slug canonique vers où rediriger, l'ancienne URL reste introuvable.
  if (!legacyEvent?.slug) return { supabase, event: null, isLegacy: false };
  return { supabase, event: legacyEvent as Event, isLegacy: true };
});
