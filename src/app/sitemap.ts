import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getAppStorageImageUrl } from "@/lib/storage/urls";
import { getCanonicalUrl, getEventUrl } from "@/lib/seo";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: events } = await fetchAllRows((from, to) =>
    supabase
      .from("events")
      .select("slug, dateEvent, image")
      .eq("verifie", true)
      .order("dateEvent", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to)
  );

  const eventUrls: MetadataRoute.Sitemap =
    events?.map((event) => {
      const imageUrl = getAppStorageImageUrl(event.image, { absolute: true });

      return {
        url: getEventUrl(event.slug),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        ...(imageUrl ? { images: [imageUrl] } : {}),
      };
    }) || [];

  return [
    {
      url: getCanonicalUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: getCanonicalUrl("/proposer-un-evenement"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...eventUrls,
  ];
}
