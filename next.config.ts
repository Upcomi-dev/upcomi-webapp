import type { NextConfig } from "next";

// Les sites autorisés à afficher les pages `/embed/*` dans une iframe. Ajouter
// un partenaire = ajouter son origine ici.
const EMBED_HOSTS = ["https://www.audax-club-parisien.com", "https://audax-club-parisien.com"];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${EMBED_HOSTS.join(" ")}`,
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "7mb",
    },
  },
  images: {
    // Keep the optimizer's cache-key space deliberately small. If the Hobby
    // quota gets close to 100%, `unoptimized: true` can be enabled here as an
    // emergency stop until the next billing cycle.
    deviceSizes: [640],
    imageSizes: [64, 128, 256, 320],
    qualities: [70],
    formats: ["image/webp"],
    minimumCacheTTL: 2_678_400,
  },
};

export default nextConfig;
