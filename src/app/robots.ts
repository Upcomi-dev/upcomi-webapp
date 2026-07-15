import type { MetadataRoute } from "next";
import { getCanonicalUrl, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/profil",
        "/favorites",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: getCanonicalUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
