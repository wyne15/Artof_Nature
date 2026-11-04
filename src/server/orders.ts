import "server-only";
import type { Locale } from "@/lib/money";
import { db } from "./db";
import type { MailOrder } from "./email";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type OrderRow = {
  id: string;
  number: number | null;
  status: string;
  email: string;
  name: string;
  locale: Locale;
  subtotalPence: number;
  shippingPence: number;
  totalPence: number;
  shipName: string;
  shipLine1: string; shipLine2: string; shipCity: string; shipPostcode: string;
  dispatchBy: string | null;
  tracking: string | null;
  needsAttention: boolean;
  attentionNote: string;
  paidAt: string | null;
  createdAt: string;
  userId: string | null;
  items: { slug: string; nameEn: string; nameRo: string; colorEn: string; colorRo: string; unitPence: number; qty: number }[];
};

export function mapOrder(r: any): OrderRow {
  return {
    id: r.id, number: r.number, status: r.status, email: r.email, name: r.name, locale: r.locale,
    subtotalPence: r.subtotal_pence, shippingPence: r.shipping_pence, totalPence: r.total_pence,
    shipName: r.ship_name, shipLine1: r.ship_line1, shipLine2: r.ship_line2, shipCity: r.ship_city, shipPostcode: r.ship_postcode,
    dispatchBy: r.dispatch_by, tracking: r.tracking, needsAttention: r.needs_attention, attentionNote: r.attention_note,
    paidAt: r.paid_at, createdAt: r.created_at, userId: r.user_id,
    items: (r.order_items ?? []).map((i: any) => ({ slug: i.slug, nameEn: i.name_en, nameRo: i.name_ro, colorEn: i.color_en ?? "", colorRo: i.color_ro ?? "", unitPence: i.unit_pence, qty: i.qty })),
  };
}

const COLS = "*, order_items(slug, name_en, name_ro, color_en, color_ro, unit_pence, qty)";

export async function listOrdersByStatus(statuses: string[] | null, limit = 100): Promise<OrderRow[]> {
  let q = db().from("orders").select(COLS).neq("status", "pending").order("created_at", { ascending: false }).limit(limit);
  if (statuses) q = q.in("status", statuses);
  const { data } = await q;
  return (data ?? []).map(mapOrder);
}

export async function getOrder(id: string): Promise<OrderRow | null> {
  const { data } = await db().from("orders").select(COLS).eq("id", id).maybeSingle();
  return data ? mapOrder(data) : null;
}

export async function listOrdersForUser(userId: string, email: string): Promise<OrderRow[]> {
  // Two exact-match queries (no pattern matching, no filter-string building): own orders + guest orders on the same verified email.
  const [byUser, byEmail] = await Promise.all([
    db().from("orders").select(COLS).neq("status", "pending").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    db().from("orders").select(COLS).neq("status", "pending").eq("email", email.toLowerCase()).order("created_at", { ascending: false }).limit(50),
  ]);
  const seen = new Map<string, OrderRow>();
  for (const r of [...(byUser.data ?? []), ...(byEmail.data ?? [])]) seen.set(r.id, mapOrder(r));
  return [...seen.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** "Wild Honey Candle (Honey)" in the order's language. */
export function itemLabel(i: { nameEn: string; nameRo: string; colorEn: string; colorRo: string }, lang: Locale): string {
  const name = lang === "ro" ? i.nameRo : i.nameEn;
  const color = lang === "ro" ? i.colorRo : i.colorEn;
  return color ? `${name} (${color})` : name;
}

export function addressLines(o: OrderRow): string[] {
  return [o.shipName, o.shipLine1, o.shipLine2, o.shipCity, o.shipPostcode, "United Kingdom"].filter(Boolean);
}

export function toMail(o: OrderRow, extra: { earliest?: string } = {}): MailOrder {
  return {
    number: o.number ?? 0,
    email: o.email,
    name: o.name || o.shipName,
    lang: o.locale,
    items: o.items.map((i) => ({ name: itemLabel(i, o.locale), qty: i.qty, unitPence: i.unitPence })),
    subtotalPence: o.subtotalPence,
    shippingPence: o.shippingPence,
    totalPence: o.totalPence,
    address: addressLines(o),
    dispatchEarliest: extra.earliest,
    dispatchLatest: o.dispatchBy ?? undefined,
    tracking: o.tracking,
  };
}
