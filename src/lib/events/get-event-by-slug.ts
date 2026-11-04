import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseLegacyEventId } from "@/lib/utils/slugify";
import type { Event } from "@/lib/types/database";

/**
 * Lecture de l'évènement partagée par le layout, `generateMetadata` et la page
 * (`cache` : une seule requête par rendu). Un ancien slug `<id>-<nom>` est
 * résolu par id ; `isLegacy` signale qu'il faut rediriger vers le slug canonique.
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

  const legacyId = parseLegacyEventId(slug);
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
