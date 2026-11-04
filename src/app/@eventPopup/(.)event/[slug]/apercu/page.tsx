import { EventFiche } from "@/components/events/event-fiche";
import { EventPopup } from "@/components/events/event-popup";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Fiche ouverte en popup depuis les favoris : la page d'origine reste
    dessous, avec le panneau des favoris ouvert, et la fermer y ramène. */
export default async function InterceptedEventPopupPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <EventPopup>
      <EventFiche slug={slug} returnTo="/" inModal />
    </EventPopup>
  );
}
