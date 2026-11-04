import { notFound, permanentRedirect } from "next/navigation";
import { getEventPath } from "@/lib/seo";
import { getEventBySlug } from "@/lib/events/get-event-by-slug";

// L'existence de l'évènement se vérifie ici, au-dessus de `loading.tsx` : une
// fois le squelette streamé, `notFound()` / la redirection ne pourraient plus
// changer le code HTTP (404 / 308) envoyé aux moteurs.
export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { event, isLegacy } = await getEventBySlug(slug);

  if (!event) notFound();
  if (isLegacy) permanentRedirect(getEventPath(event.slug));

  return children;
}
