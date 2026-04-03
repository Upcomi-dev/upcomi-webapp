import { createClient } from "@/lib/supabase/server";
import { makeEventSlug } from "@/lib/utils/slugify";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, nomEvent, dateEvent")
    .order("dateEvent", { ascending: false });

  const eventUrls: MetadataRoute.Sitemap =
    events?.map((event) => ({
      url: `https://upcomi.com/event/${makeEventSlug(event.id, event.nomEvent)}`,
      lastModified: event.dateEvent || new Date().toISOString(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })) || [];

  return [
    {
      url: "https://upcomi.com",
      lastModified: new Date().toISOString(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...eventUrls,
  ];
}
