import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Art of Nature",
    short_name: "Art of Nature",
    description: "Handmade beeswax candles and natural skincare",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F3EB",
    theme_color: "#2F3817",
    icons: [{ src: "/logo.png", sizes: "256x256", type: "image/png" }],
  };
}
