/** Product colours and photos: shared, dependency-free helpers (safe for server and client). */
export type ProductColor = { id: string; nameEn: string; nameRo: string; hex: string };
export type ColorView = { id: string; name: string; hex: string };

export const IMAGE_PATH = /^[a-f0-9]{32}\.(jpg|png)$/;
export const COLOR_ID = /^[a-z0-9]{1,24}$/;
export const HEX = /^#[0-9A-Fa-f]{6}$/;
export const MAX_IMAGES = 8;
export const MAX_COLORS = 12;

export function isImagePath(v: unknown): v is string {
  return typeof v === "string" && IMAGE_PATH.test(v);
}

/** Reads whatever the database returns for `images` and keeps only well-formed paths. */
export function cleanImages(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isImagePath).slice(0, MAX_IMAGES);
}

/** Reads whatever the database returns for `colors` and keeps only well-formed, unique entries. */
export function cleanColors(v: unknown): ProductColor[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: ProductColor[] = [];
  for (const c of v) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    if (typeof o.id !== "string" || !COLOR_ID.test(o.id) || seen.has(o.id)) continue;
    if (typeof o.nameEn !== "string" || typeof o.nameRo !== "string" || typeof o.hex !== "string" || !HEX.test(o.hex)) continue;
    const nameEn = o.nameEn.trim().slice(0, 40);
    const nameRo = o.nameRo.trim().slice(0, 40);
    if (!nameEn || !nameRo) continue;
    seen.add(o.id);
    out.push({ id: o.id, nameEn, nameRo, hex: o.hex });
    if (out.length >= MAX_COLORS) break;
  }
  return out;
}

export function colorName(c: ProductColor, lang: "en" | "ro"): string {
  return lang === "ro" ? c.nameRo : c.nameEn;
}

/** Public URL of a photo in the Supabase Storage bucket. Returns "" for anything that is not a valid path. */
export function imageUrl(base: string, path: string): string {
  if (!isImagePath(path) || !base) return "";
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/product-images/${path}`;
}
