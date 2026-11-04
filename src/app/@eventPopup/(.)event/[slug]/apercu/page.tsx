import { EventFiche } from "@/components/events/event-fiche";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Fiche ouverte en popup depuis les favoris : la page d'origine reste
    dessous, avec le panneau des favoris ouvert, et la fermer y ramène. */
export default async function InterceptedEventPopupPage({ params }: PageProps) {
  const { slug } = await params;

  // La popup elle-même est dans layout.tsx.
  return <EventFiche slug={slug} returnTo="/" inModal />;
}
