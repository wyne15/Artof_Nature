import { z } from "zod";
import { COLOR_ID, HEX, IMAGE_PATH, MAX_COLORS, MAX_IMAGES } from "./variants";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60);
const locale = z.enum(["en", "ro"]);
// Practical email check; the real proof of ownership is the confirmation email.
const email = z.string().trim().toLowerCase().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);

const colorId = z.string().regex(COLOR_ID);

export const checkoutBody = z.object({
  items: z.array(z.object({ slug, qty: z.number().int().min(1).max(20), color: colorId.optional() })).min(1).max(30),
  locale,
});
export type CheckoutBody = z.infer<typeof checkoutBody>;

export const contactBody = z.object({
  name: z.string().trim().min(1).max(100),
  email,
  topic: z.enum(["order", "product", "gift", "privacy", "other"]),
  message: z.string().trim().min(10).max(4000),
  consent: z.literal(true),
  website: z.string().max(0).optional(), // honeypot, must stay empty
  elapsedMs: z.number().int().min(0).max(86_400_000).optional(),
  locale,
});

export const newsletterBody = z.object({
  email,
  consent: z.literal(true),
  website: z.string().max(0).optional(),
  locale,
});

export const registerBody = z.object({
  firstName: z.string().trim().min(1).max(60),
  email,
  password: z.string().min(10).max(128),
  acceptTerms: z.literal(true),
  marketing: z.boolean().default(false),
  locale,
});

export const loginBody = z.object({ email, password: z.string().min(1).max(128), locale: locale.optional() });
export const resetRequestBody = z.object({ email, locale });
export const updatePasswordBody = z.object({ password: z.string().min(10).max(128) });
export const deleteAccountBody = z.object({ password: z.string().min(1).max(128), confirm: z.literal(true) });

export const profileBody = z.object({
  firstName: z.string().trim().min(1).max(60),
  marketing: z.boolean(),
});

export const adminLoginBody = z.object({
  email,
  password: z.string().min(1).max(128),
  code: z.string().regex(/^\d{6}$/),
});

export const trackingNumber = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{8,30}$/);

export const orderStatus = z.enum(["paid", "packed", "dispatched", "delivered", "refunded", "cancelled"]);

export const productInput = z.object({
  slug,
  category: z.enum(["candles", "skincare", "gifts"]),
  nameEn: z.string().trim().min(2).max(120),
  nameRo: z.string().trim().min(2).max(120),
  noteEn: z.string().trim().max(160).default(""),
  noteRo: z.string().trim().max(160).default(""),
  descEn: z.string().trim().min(5).max(1500),
  descRo: z.string().trim().min(5).max(1500),
  formatEn: z.string().trim().max(80).default(""),
  formatRo: z.string().trim().max(80).default(""),
  pricePence: z.number().int().min(50).max(100_000),
  multiQty: z.number().int().min(0).max(10).default(0),
  multiPricePence: z.number().int().min(0).max(100_000).default(0),
  multi2Qty: z.number().int().min(0).max(10).default(0),
  multi2PricePence: z.number().int().min(0).max(100_000).default(0),
  multi3Qty: z.number().int().min(0).max(10).default(0),
  multi3PricePence: z.number().int().min(0).max(100_000).default(0),
  stock: z.number().int().min(0).max(100_000),
  active: z.boolean(),
  tag: z.enum(["", "best_seller", "popular", "new", "gift_set"]).default(""),
  artKind: z.enum(["candle", "tin", "balm", "tube", "cream", "set"]).default("candle"),
  artColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#C9993A"),
  artWax: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#EBCB7D"),
  images: z.array(z.string().regex(IMAGE_PATH)).max(MAX_IMAGES).default([]),
  colors: z
    .array(z.object({ id: colorId, nameEn: z.string().trim().min(1).max(40), nameRo: z.string().trim().min(1).max(40), hex: z.string().regex(HEX) }))
    .max(MAX_COLORS)
    .default([])
    .refine((a) => new Set(a.map((c) => c.id)).size === a.length, "duplicate_color"),
});
export type ProductInput = z.infer<typeof productInput>;

export const settingsInput = z.object({
  shippingPence: z.number().int().min(0).max(5000),
  freeThresholdPence: z.number().int().min(0).max(100_000),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  cutoffHour: z.number().int().min(0).max(24),
  leadMinDays: z.number().int().min(1).max(30),
  leadMaxDays: z.number().int().min(1).max(30),
  dailyCap: z.number().int().min(1).max(200),
  manualPause: z.boolean(),
  closures: z
    .array(
      z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        mode: z.enum(["open", "paused"]),
        noteEn: z.string().trim().max(200).optional(),
        noteRo: z.string().trim().max(200).optional(),
      }),
    )
    .max(40),
});

export const addressBody = z.object({
  line1: z.string().trim().min(1).max(100),
  line2: z.string().trim().max(100).default(""),
  city: z.string().trim().min(1).max(60),
  postcode: z.string().trim().toUpperCase().regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/),
});

export const tokenBody = z.object({ token: z.string().min(20).max(1000) });

export const confirmBody = z.object({
  tokenHash: z.string().min(10).max(200).regex(/^[A-Za-z0-9_-]+$/),
  type: z.enum(["signup", "recovery"]),
});

export const resetPasswordBody = z.object({ password: z.string().min(10).max(128) });
