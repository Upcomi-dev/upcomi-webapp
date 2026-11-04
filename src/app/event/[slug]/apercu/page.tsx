import { redirect } from "next/navigation";
import { getEventPath } from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Rechargement ou lien partagé depuis la popup : on sert la fiche complète.
export default async function EventPopupFallbackPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(getEventPath(slug));
}
