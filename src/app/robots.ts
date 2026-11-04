import type { MetadataRoute } from "next";
import { abs } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/en/account", "/ro/account", "/en/checkout", "/ro/checkout", "/en/newsletter", "/ro/newsletter"] }],
    sitemap: abs("/sitemap.xml"),
    host: abs(""),
  };
}
