import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { sanitizeReturnTo } from "@/lib/utils/navigation";
import { getEventPath, getEventUrl, SITE_NAME } from "@/lib/seo";
import { parseLegacyEventId } from "@/lib/utils/slugify";
import { getAppStorageImageUrl } from "@/lib/storage/urls";
import { EventFiche } from "@/components/events/event-fiche";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const event = await fetchEventForMetadata(supabase, slug);

  if (!event) return { title: "Événement non trouvé" };

  const title = event.nomEvent || "Événement";
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
      title: event.nomEvent || "Événement Upcomi",
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: metadataImage ? [{ url: metadataImage }] : [],
      locale: "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: event.nomEvent || "Événement Upcomi",
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

async function fetchEventForMetadata(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string
) {
  const baseSelect = "id, slug, nomEvent, dateEvent, villeDepart, paysDepart, description, image";
  const { data: event } = await supabase
    .from("events")
    .select(baseSelect)
    .eq("slug", slug)
    .eq("verifie", true)
    .maybeSingle();

  if (event) return event;

  const legacyId = parseLegacyEventId(slug);
  if (legacyId == null) return null;

  const { data: legacyEvent } = await supabase
    .from("events")
    .select(baseSelect)
    .eq("id", legacyId)
    .eq("verifie", true)
    .maybeSingle();

  return legacyEvent;
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
