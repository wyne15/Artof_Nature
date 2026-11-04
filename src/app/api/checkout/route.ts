import Stripe from "stripe";
import { checkoutBody } from "@/lib/validation";
import { shippingFor, subtotalOf, unitPrices } from "@/lib/money";
import { getSession } from "@/server/session";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { allow, bad, ipHash, json, readJson } from "@/server/http";
import { listProducts } from "@/server/catalog";
import { getShopInfo } from "@/server/settings";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req, checkoutBody);
  if (!parsed.ok) return parsed.res;
  const { items, locale } = parsed.data;

  if (!(await allow(`checkout:${ipHash(req.headers)}`, 12, 600))) return bad("rate_limited", 429);

  const info = await getShopInfo();
  if (info.status.state === "paused") return json({ ok: false, error: "shop_paused", resumeOn: info.status.resumeOn }, 409);

  /* Prices, names and stock ALWAYS come from our database. The browser only says "slug + quantity". */
  const catalogue = new Map((await listProducts()).map((p) => [p.slug, p]));
  /* One line per product + colour. The colour must be one the admin offers for that product. */
  const merged = new Map<string, { slug: string; color: string; qty: number }>();
  for (const i of items) {
    const p = catalogue.get(i.slug);
    if (!p) return json({ ok: false, error: "unknown_product", slug: i.slug }, 422);
    const color = i.color ?? "";
    if (p.colors.length > 0) {
      if (!color) return json({ ok: false, error: "color_required", slug: i.slug }, 422);
      if (!p.colors.some((c) => c.id === color)) return json({ ok: false, error: "unknown_color", slug: i.slug }, 422);
    } else if (color) {
      return json({ ok: false, error: "unknown_color", slug: i.slug }, 422);
    }
    const key = `${i.slug}|${color}`;
    const cur = merged.get(key);
    merged.set(key, { slug: i.slug, color, qty: (cur?.qty ?? 0) + i.qty });
  }

  const perProduct = new Map<string, number>();
  type Line = { id: string; slug: string; nameEn: string; nameRo: string; colorEn: string; colorRo: string; unitPence: number; qty: number };
  const lines: Line[] = [];
  for (const { slug, color, qty } of merged.values()) {
    const p = catalogue.get(slug)!;
    if (qty > 20) return json({ ok: false, error: "quantity", slug }, 422);
    // Stock is one number per product, shared by all its colours.
    const total = (perProduct.get(slug) ?? 0) + qty;
    perProduct.set(slug, total);
    if (p.stock < total) return json({ ok: false, error: "out_of_stock", slug, available: p.stock }, 409);
    const c = p.colors.find((x) => x.id === color);
    lines.push({ id: p.id, slug, nameEn: p.nameEn, nameRo: p.nameRo, colorEn: c?.nameEn ?? "", colorRo: c?.nameRo ?? "", unitPence: p.pricePence, qty });
  }

  /* "N for £X" offers: every complete group of N pieces of one product (all colours together) costs £X.
     We turn that into an exact price per piece, so the order, Stripe and the emails all see plain unit prices. */
  const bySlug = new Map<string, Line[]>();
  for (const l of lines) bySlug.set(l.slug, [...(bySlug.get(l.slug) ?? []), l]);
  const priced: Line[] = [];
  for (const group of bySlug.values()) {
    const p = catalogue.get(group[0]!.slug)!;
    const units = unitPrices(p.pricePence, group.reduce((n, l) => n + l.qty, 0), [{ qty: p.multiQty, pricePence: p.multiPricePence }, { qty: p.multi2Qty, pricePence: p.multi2PricePence }, { qty: p.multi3Qty, pricePence: p.multi3PricePence }]);
    let at = 0;
    for (const l of group) {
      const mine = units.slice(at, at + l.qty);
      at += l.qty;
      for (let i = 0; i < mine.length; ) {
        let j = i;
        while (j < mine.length && mine[j] === mine[i]) j++;
        priced.push({ ...l, unitPence: mine[i]!, qty: j - i });
        i = j;
      }
    }
  }

  const rules = { shippingPence: info.settings.shippingPence, freeThresholdPence: info.settings.freeThresholdPence };
  const subtotal = subtotalOf(priced);
  const shipping = shippingFor(subtotal, rules);
  const total = subtotal + shipping;
  if (total < 50) return bad("too_small");

  const session = await getSession();

  /* 1. Pending order (our record of exactly what was priced). Becomes "paid" only via the signed webhook. */
  const { data: order, error: oErr } = await db()
    .from("orders")
    .insert({
      status: "pending",
      user_id: session?.userId ?? null,
      email: session?.email ?? "pending@invalid.local",
      name: session?.firstName ?? "",
      locale,
      subtotal_pence: subtotal,
      shipping_pence: shipping,
      total_pence: total,
    })
    .select("id")
    .single();
  if (oErr || !order) {
    console.error("order insert", oErr?.message);
    return bad("server_error", 500);
  }
  const { error: iErr } = await db()
    .from("order_items")
    .insert(priced.map((l) => ({ order_id: order.id, product_id: l.id.startsWith("seed-") ? null : l.id, slug: l.slug, name_en: l.nameEn, name_ro: l.nameRo, color_en: l.colorEn, color_ro: l.colorRo, unit_pence: l.unitPence, qty: l.qty })));
  if (iErr) {
    console.error("items insert", iErr.message);
    return bad("server_error", 500);
  }

  /* 2. Stripe Checkout. UK delivery only. */
  const stripe = new Stripe(env.stripeSecretKey);
  const ro = locale === "ro";
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      metadata: { order_id: order.id },
      payment_intent_data: { metadata: { order_id: order.id } },
      customer_email: session?.email,
      locale: ro ? "ro" : "en",
      currency: "gbp",
      line_items: priced.map((l) => ({
        quantity: l.qty,
        price_data: { currency: "gbp", unit_amount: l.unitPence, product_data: { name: (ro ? l.nameRo : l.nameEn) + ((ro ? l.colorRo : l.colorEn) ? ` (${ro ? l.colorRo : l.colorEn})` : "") } },
      })),
      shipping_address_collection: { allowed_countries: ["GB"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shipping, currency: "gbp" },
            display_name: shipping === 0 ? (ro ? "Livrare gratuită în UK" : "Free UK delivery") : ro ? "Livrare în UK" : "UK delivery",
          },
        },
      ],
      custom_text: {
        submit: {
          message: ro
            ? `Prin plată accepți Termenii și Politica de retur: ${env.siteUrl}/ro/terms și ${env.siteUrl}/ro/returns`
            : `By paying you accept our Terms and Returns policy: ${env.siteUrl}/en/terms and ${env.siteUrl}/en/returns`,
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      success_url: `${env.siteUrl}/${locale}/checkout/success`,
      cancel_url: `${env.siteUrl}/${locale}/shop`,
    });
    if (!checkout.url) throw new Error("no_checkout_url");
    await db().from("orders").update({ stripe_session_id: checkout.id }).eq("id", order.id);
    return json({ ok: true, url: checkout.url });
  } catch (e) {
    console.error("stripe session", e instanceof Error ? e.message : e);
    await db().from("orders").delete().eq("id", order.id).eq("status", "pending");
    return bad("payment_unavailable", 502);
  }
}
