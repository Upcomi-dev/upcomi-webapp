import { createClient } from "@/lib/supabase/server";
import { getAppStorageImageUrl } from "@/lib/storage/urls";
import { getCanonicalUrl, getEventUrl } from "@/lib/seo";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("slug, dateEvent, image")
    .eq("verifie", true)
    .order("dateEvent", { ascending: false });

  const eventUrls: MetadataRoute.Sitemap =
    events?.map((event) => {
      const imageUrl = getAppStorageImageUrl(event.image, { absolute: true });

      return {
        url: getEventUrl(event.slug),
        lastModified: event.dateEvent || new Date().toISOString(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        ...(imageUrl ? { images: [imageUrl] } : {}),
      };
    }) || [];

  return [
    {
      url: getCanonicalUrl("/"),
      lastModified: new Date().toISOString(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: getCanonicalUrl("/proposer-un-evenement"),
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...eventUrls,
  ];
}
