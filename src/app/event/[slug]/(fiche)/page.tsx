import type { Metadata } from "next";
import { sanitizeReturnTo } from "@/lib/utils/navigation";
import { getEventPath, getEventUrl, SITE_NAME } from "@/lib/seo";
import { getEventBySlug } from "@/lib/events/get-event-by-slug";
import { getAppStorageImageUrl } from "@/lib/storage/urls";
import { EventFiche } from "@/components/events/event-fiche";
import { withEditionYear } from "@/lib/utils/event-dates";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { event } = await getEventBySlug(slug);

  if (!event) return { title: "Événement non trouvé" };

  // L'année distingue les éditions d'un évènement annuel dans Google et les aperçus de lien.
  const title = withEditionYear(event.nomEvent || "Événement", event.dateEvent);
  const description = buildMetadataDescription(event);
  const metadataImage = getAppStorageImageUrl(event.image, { absolute: true });
  const canonicalPath = getEventPath(event.slug);
  const canonicalUrl = getEventUrl(event.slug);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: metadataImage ? [{ url: metadataImage }] : [],
      locale: "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: metadataImage ? [metadataImage] : [],
    },
  };
}

export default async function EventPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const returnTo = sanitizeReturnTo(
    typeof query.returnTo === "string" ? query.returnTo : null
  ) ?? "/";

  return <EventFiche slug={slug} returnTo={returnTo} />;
}

function buildMetadataDescription(event: {
  nomEvent: string | null;
  villeDepart: string | null;
  description: string | null;
}) {
  const description = event.description?.replace(/\s+/g, " ").trim();
  if (description) return description.slice(0, 160);

  return `${event.nomEvent || "Événement vélo"} à ${event.villeDepart || "France"}`;
}
