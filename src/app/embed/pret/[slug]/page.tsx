import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompatibilityCard } from "@/components/events/compatibility-card";
import { InterestedPeopleProvider } from "@/components/events/interested-people-context";
import { buildCompatEvent } from "@/lib/compatibility/event-input";
import { getEventBySlug } from "@/lib/events/get-event-by-slug";
import { getEventUrl } from "@/lib/seo";
import type { SousEvent } from "@/lib/types/database";

// Une page faite pour être affichée dans l'iframe d'un site partenaire, pas
// pour être trouvée : la fiche `/event/[slug]` reste la seule page indexée.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Le bloc « Suis-je prêt·e pour … ? » seul, à intégrer en iframe sur le site
 * d'un organisateur (qui a le droit de l'afficher : `next.config.ts`).
 *
 * Dans une iframe tierce le navigateur n'envoie pas la session Upcomi : tout le
 * monde y est déconnecté. Le questionnaire et le résultat fonctionnent sans
 * compte ; ce qui en demande un renvoie vers la fiche Upcomi, réponses
 * transmises (`externalUrl`).
 */
export default async function EmbedPretPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, event } = await getEventBySlug(slug);
  if (!event) notFound();

  const { data } = await supabase
    .from("sous_events")
    .select("*")
    .eq("event_id", event.id)
    .order("distance", { ascending: true });
  const eventUrl = getEventUrl(event.slug);

  return (
    <>
      {/* Le fond crème et les halos du site n'ont rien à faire chez l'hôte :
          la page est transparente, seul le bloc lila se voit. */}
      <style>{"html,body{background:transparent;min-height:0}.ambient-orbs{display:none}"}</style>
      <InterestedPeopleProvider eventId={event.id}>
        <CompatibilityCard
          eventId={event.id}
          event={buildCompatEvent(event, (data as SousEvent[] | null) ?? [])}
          eventDate={event.dateEvent}
          externalUrl={eventUrl}
          className="mb-0"
        />
      </InterestedPeopleProvider>
    </>
  );
}
