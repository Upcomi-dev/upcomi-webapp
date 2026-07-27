import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
