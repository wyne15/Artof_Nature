import type { MetadataRoute } from "next";
import { abs, localePath } from "@/lib/seo";
import { listProducts } from "@/server/catalog";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

const STATIC = ["", "/shop", "/story", "/faq", "/contact", "/delivery", "/returns", "/privacy", "/terms", "/cookies"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = env.dbConfigured || !env.isProd ? await listProducts().catch(() => []) : [];
  const paths = [...STATIC, ...products.map((p) => `/product/${p.slug}`)];
  const now = new Date();
  return paths.flatMap((path) =>
    (["en", "ro"] as const).map((lang) => ({
      url: abs(localePath(lang, path)),
      lastModified: now,
      changeFrequency: (path === "" || path === "/shop" ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: path === "" ? 1 : path === "/shop" || path.startsWith("/product/") ? 0.8 : 0.5,
      alternates: { languages: { en: abs(localePath("en", path)), ro: abs(localePath("ro", path)) } },
    })),
  );
}
