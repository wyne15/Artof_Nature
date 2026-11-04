import "server-only";
import { cache } from "react";
import { SEED_PRODUCTS } from "@/data/seed-products";
import type { Locale } from "@/lib/money";
import { cleanColors, cleanImages, colorName, imageUrl, type ColorView, type ProductColor } from "@/lib/variants";
import { db } from "./db";
import { env } from "./env";

export type ArtKind = "candle" | "tin" | "balm" | "tube" | "cream" | "set";
export type Category = "candles" | "skincare" | "gifts";
export type Tag = "" | "best_seller" | "popular" | "new" | "gift_set";

export type Product = {
  id: string;
  slug: string;
  category: Category;
  nameEn: string; nameRo: string;
  noteEn: string; noteRo: string;
  descEn: string; descRo: string;
  formatEn: string; formatRo: string;
  pricePence: number;
  /** "N pieces for £X" offer. multiQty 0 = no offer. */
  multiQty: number;
  multiPricePence: number;
  multi2Qty: number;
  multi2PricePence: number;
  multi3Qty: number;
  multi3PricePence: number;
  stock: number;
  active: boolean;
  tag: Tag;
  artKind: ArtKind;
  artColor: string;
  artWax: string;
  sort: number;
  /** Storage file names, first one is the main photo. */
  images: string[];
  colors: ProductColor[];
};

/** What pages and the cart need, already in the visitor's language. */
export type ProductView = {
  id: string;
  slug: string;
  category: Category;
  name: string;
  note: string;
  desc: string;
  format: string;
  pricePence: number;
  multiQty: number;
  multiPricePence: number;
  multi2Qty: number;
  multi2PricePence: number;
  multi3Qty: number;
  multi3PricePence: number;
  inStock: boolean;
  stock: number;
  tag: Tag;
  artKind: ArtKind;
  artColor: string;
  artWax: string;
  /** Full public URLs of the photos (empty = show the illustration). */
  imageUrls: string[];
  colors: ColorView[];
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function fromRow(r: any): Product {
  return {
    id: r.id, slug: r.slug, category: r.category,
    nameEn: r.name_en, nameRo: r.name_ro, noteEn: r.note_en, noteRo: r.note_ro,
    descEn: r.desc_en, descRo: r.desc_ro, formatEn: r.format_en, formatRo: r.format_ro,
    pricePence: r.price_pence, stock: r.stock, active: r.active, tag: r.tag,
    multiQty: Number(r.multi_qty ?? 0), multiPricePence: Number(r.multi_price_pence ?? 0),
    multi2Qty: Number(r.multi2_qty ?? 0), multi2PricePence: Number(r.multi2_price_pence ?? 0),
    multi3Qty: Number(r.multi3_qty ?? 0), multi3PricePence: Number(r.multi3_price_pence ?? 0),
    artKind: r.art_kind, artColor: r.art_color, artWax: r.art_wax, sort: r.sort,
    images: cleanImages(r.images), colors: cleanColors(r.colors),
  };
}

function seedProducts(): Product[] {
  return SEED_PRODUCTS.map((p) => ({ ...p, id: `seed-${p.slug}`, active: true, images: [], colors: [], multiQty: 0, multiPricePence: 0, multi2Qty: 0, multi2PricePence: 0, multi3Qty: 0, multi3PricePence: 0 }));
}

export function localize(p: Product, lang: Locale): ProductView {
  const ro = lang === "ro";
  return {
    id: p.id, slug: p.slug, category: p.category,
    name: ro ? p.nameRo : p.nameEn, note: ro ? p.noteRo : p.noteEn, desc: ro ? p.descRo : p.descEn,
    format: ro ? p.formatRo : p.formatEn, pricePence: p.pricePence, inStock: p.stock > 0, stock: p.stock,
    multiQty: p.multiQty, multiPricePence: p.multiPricePence,
    multi2Qty: p.multi2Qty, multi2PricePence: p.multi2PricePence,
    multi3Qty: p.multi3Qty, multi3PricePence: p.multi3PricePence,
    tag: p.tag, artKind: p.artKind, artColor: p.artColor, artWax: p.artWax,
    imageUrls: p.images.map((f) => imageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", f)).filter(Boolean),
    colors: p.colors.map((c) => ({ id: c.id, name: colorName(c, lang), hex: c.hex })),
  };
}

export function listProducts(opts: { includeInactive?: boolean } = {}): Promise<Product[]> {
  return loadProducts(Boolean(opts.includeInactive));
}

const loadProducts = cache(async (includeInactive: boolean): Promise<Product[]> => {
  const opts = { includeInactive };
  if (!env.dbConfigured) {
    if (env.isProd) throw new Error("Database is not configured");
    return seedProducts(); // local preview before Supabase is set up
  }
  let q = db().from("products").select("*").order("sort", { ascending: true }).order("created_at", { ascending: true });
  if (!opts.includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw new Error(`products: ${error.message}`);
  return (data ?? []).map(fromRow);
});

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return null;
  if (!env.dbConfigured) {
    if (env.isProd) throw new Error("Database is not configured");
    return seedProducts().find((p) => p.slug === slug) ?? null;
  }
  const { data, error } = await db().from("products").select("*").eq("slug", slug).eq("active", true).maybeSingle();
  if (error) throw new Error(`product: ${error.message}`);
  return data ? fromRow(data) : null;
});
