import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Upcomi",
    short_name: "Upcomi",
    description:
      "Découvre les courses, aventures, brevets et social rides vélo en France et à l'étranger.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3ebdf",
    theme_color: "#eb5f3b",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
