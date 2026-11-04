import type { MetadataRoute } from "next";
import { getCanonicalUrl, HONEYPOT_PATH, SITE_URL } from "@/lib/seo";

// Robots qui aspirent le contenu pour entraîner des modèles (pas pour envoyer
// du trafic). Les moteurs de recherche, y compris IA (OAI-SearchBot,
// PerplexityBot), restent autorisés. Seuls les robots polis respectent ça :
// les scrapers concurrents sont gérés par la RLS et le Vercel Firewall.
const AI_TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "meta-externalagent",
  "Amazonbot",
  "cohere-ai",
  "Diffbot",
  "omgili",
  "Timpibot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
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
          HONEYPOT_PATH,
        ],
      },
      { userAgent: AI_TRAINING_BOTS, disallow: "/" },
    ],
    sitemap: getCanonicalUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
