"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isIsoDate, validateSchedule, type Closure, type Schedule } from "@/lib/logistics";
import { safeEqual } from "@/lib/token";
import { verifyTotp } from "@/lib/totp";
import { adminLoginBody, orderStatus, productInput, settingsInput, trackingNumber } from "@/lib/validation";
import { clearAdminCookie, requireAdminAction, setAdminCookie } from "@/server/adminAuth";
import { authClient, db } from "@/server/db";
import { sendEmail, trackingEmail } from "@/server/email";
import { env } from "@/server/env";
import { allow, audit, ipHash } from "@/server/http";
import { getOrder, toMail } from "@/server/orders";
import { getSettings } from "@/server/settings";

/* ───────── helpers ───────── */
const uuid = z.string().uuid();
const GENERIC = "Datele nu sunt corecte. Verifică emailul, parola și codul.";

function back(fd: FormData, fallback: string): string {
  const v = String(fd.get("back") ?? "");
  return /^\/admin(\/[a-z0-9\-/]*)?(\?[a-z0-9=&_-]*)?$/i.test(v) ? v : fallback;
}
function go(path: string, m: string): never {
  const sep = path.includes("?") ? "&" : "?";
  revalidatePath("/admin", "layout");
  redirect(`${path}${sep}m=${m}`);
}
function poundsToPence(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100);
}
const int = (v: FormDataEntryValue | null) => (/^\d{1,6}$/.test(String(v ?? "").trim()) ? Number(String(v).trim()) : NaN);

/* ───────── sign in / out ───────── */
export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const h = await headers();
  const ip = ipHash(h);
  if (!(await allow(`adm:ip:${ip}`, 6, 900)) || !(await allow("adm:global", 30, 3600))) {
    return { error: "Prea multe încercări. Așteaptă un sfert de oră și încearcă din nou." };
  }
  // Local testing only: ADMIN_DEV_SKIP_CODE=true skips the authenticator code. It can never apply in production.
  const skipCode = !env.isProd && process.env.ADMIN_DEV_SKIP_CODE === "true";
  const parsed = adminLoginBody.safeParse({ email: fd.get("email"), password: fd.get("password"), code: skipCode ? "000000" : String(fd.get("code") ?? "").replace(/\s/g, "") });
  if (!parsed.success) return { error: GENERIC };
  const { email, password, code } = parsed.data;

  // 1) email must be the owner's, 2) password checked by Supabase Auth, 3) one-time code from the authenticator app
  const isOwner = safeEqual(email, env.ownerEmail);
  const signIn = await authClient().auth.signInWithPassword({ email: env.ownerEmail, password });
  const passwordOk = isOwner && !signIn.error && Boolean(signIn.data.user);
  const step = skipCode ? 0 : verifyTotp(env.adminTotpSecret, code);
  if (!passwordOk || step === null) {
    await audit("admin", "login_failed", { ip });
    return { error: GENERIC };
  }
  // A code can be used once: only accept a step newer than the last one used.
  const { data: advanced } = skipCode ? { data: [{ id: 1 }] } : await db().from("admin_state").update({ last_totp_step: step }).eq("id", 1).lt("last_totp_step", step).select("id");
  if (!advanced?.length) {
    await audit("admin", "login_replay_blocked", { ip });
    return { error: "Codul a fost deja folosit. Așteaptă codul următor (30 de secunde)." };
  }
  await setAdminCookie();
  await audit("admin", "login_ok", { ip });
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearAdminCookie();
  redirect("/admin/login");
}

/* ───────── orders ───────── */
export async function setStatusAction(fd: FormData): Promise<void> {
  await requireAdminAction();
  const to = back(fd, "/admin/orders");
  const id = uuid.safeParse(fd.get("id"));
  const status = orderStatus.safeParse(fd.get("status"));
  if (!id.success || !status.success) go(to, "err");
  const patch: Record<string, unknown> = { status: status.data, updated_at: new Date().toISOString() };
  if (status.data === "dispatched") patch.dispatched_at = new Date().toISOString();
  const { error } = await db().from("orders").update(patch).eq("id", id.data);
  if (error) go(to, "err");
  await audit("admin", "order_status", { id: id.data, status: status.data });
  go(to, "status");
}

/** Marks an order as posted and emails the customer (tracking number optional). */
export async function dispatchAction(fd: FormData): Promise<void> {
  await requireAdminAction();
  const to = back(fd, "/admin/orders");
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) go(to, "err");
  const raw = String(fd.get("tracking") ?? "").replace(/\s/g, "");
  let tracking: string | null = null;
  if (raw) {
    const t = trackingNumber.safeParse(raw);
    if (!t.success) go(to, "tracking");
    tracking = t.data;
  }
  const order = await getOrder(id.data);
  if (!order || !order.number) go(to, "err");
  const { error } = await db().from("orders").update({ status: "dispatched", tracking, dispatched_at: new Date().toISOString(), tracking_emailed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id.data);
  if (error) go(to, "err");
  const mail = toMail({ ...order, tracking });
  const sent = await sendEmail(trackingEmail({ number: mail.number, email: mail.email, name: mail.name, lang: mail.lang }, tracking));
  await audit("admin", "order_dispatched", { id: id.data, emailed: sent });
  go(to, sent ? "dispatched" : "dispatched_noemail");
}

export async function clearFlagAction(fd: FormData): Promise<void> {
  await requireAdminAction();
  const to = back(fd, "/admin/orders");
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) go(to, "err");
  await db().from("orders").update({ needs_attention: false }).eq("id", id.data);
  go(to, "flag");
}

/* ───────── products ───────── */
export async function quickProductAction(fd: FormData): Promise<void> {
  await requireAdminAction();
  const id = uuid.safeParse(fd.get("id"));
  const price = poundsToPence(fd.get("price"));
  const stock = int(fd.get("stock"));
  if (!id.success || !Number.isFinite(price) || price < 50 || price > 100000 || !Number.isFinite(stock) || stock > 100000) go("/admin/products", "err");
  const { error } = await db().from("products").update({ price_pence: price, stock, active: fd.get("active") === "on", updated_at: new Date().toISOString() }).eq("id", id.data);
  if (error) go("/admin/products", "err");
  await audit("admin", "product_quick", { id: id.data, price, stock });
  go("/admin/products", "saved");
}

/** "Wheat Taper" -> "wheat-taper" (no accents, lowercase, dashes). */
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export async function saveProductAction(fd: FormData): Promise<void> {
  await requireAdminAction();
  const idRaw = String(fd.get("id") ?? "");
  const editing = idRaw !== "";
  const here = editing ? `/admin/products/${idRaw}` : "/admin/products/new";
  if (editing && !uuid.safeParse(idRaw).success) go("/admin/products", "err");
  const g = (k: string) => String(fd.get(k) ?? "");
  const json = (k: string): unknown => {
    try {
      return JSON.parse(g(k) || "[]");
    } catch {
      return null;
    }
  };

  // Simplified form: Romanian fields are optional (they fall back to English) and the URL address is generated from the name.
  const nameEn = g("nameEn");
  const descEn = g("descEn");
  const noteEn = g("noteEn");
  const formatEn = g("formatEn");
  const nameRo = g("nameRo").trim() || nameEn;
  const descRo = g("descRo").trim() || descEn;
  const noteRo = g("noteRo").trim() || noteEn;
  const formatRo = g("formatRo").trim() || formatEn;
  const typedSlug = slugify(g("slug"));
  let slug = typedSlug || slugify(nameEn);
  if (editing && !typedSlug) {
    const { data: cur } = await db().from("products").select("slug").eq("id", idRaw).maybeSingle();
    if (cur?.slug) slug = String(cur.slug);
  }
  // Optional "N pieces for £X" offer: both fields empty = no offer.
  const mqRaw = g("multiQty").trim();
  const mpRaw = g("multiPrice").trim();
  const q2Raw = String(fd.get("multi2Qty") ?? "").trim();
  const p2Raw = String(fd.get("multi2Price") ?? "").trim();
  const q3Raw = String(fd.get("multi3Qty") ?? "").trim();
  const p3Raw = String(fd.get("multi3Price") ?? "").trim();

  const parsed = productInput.safeParse({
    slug,
    category: g("category"),
    nameEn, nameRo,
    noteEn, noteRo,
    descEn, descRo,
    formatEn, formatRo,
    pricePence: poundsToPence(fd.get("price")),
    multiQty: mqRaw === "" ? 0 : int(fd.get("multiQty")),
    multiPricePence: mpRaw === "" ? 0 : poundsToPence(fd.get("multiPrice")),
    multi2Qty: q2Raw === "" ? 0 : int(fd.get("multi2Qty")),
    multi2PricePence: p2Raw === "" ? 0 : poundsToPence(fd.get("multi2Price")),
    multi3Qty: q3Raw === "" ? 0 : int(fd.get("multi3Qty")),
    multi3PricePence: p3Raw === "" ? 0 : poundsToPence(fd.get("multi3Price")),
    stock: int(fd.get("stock")),
    active: fd.get("active") === "on",
    tag: g("tag"),
    artKind: g("artKind"), artColor: g("artColor"), artWax: g("artWax"),
    images: json("images"), colors: json("colors"),
  });
  if (!parsed.success) go(here, "invalid");
  const d = parsed.data;
  // The offer must be a real saving: at least 2 pieces, and cheaper than buying them one by one.
  const badOffer = ([[d.multiQty, d.multiPricePence], [d.multi2Qty, d.multi2PricePence], [d.multi3Qty, d.multi3PricePence]] as const).some(([q, pr]) => (q === 0 ? pr !== 0 : !(q >= 2 && pr > 0 && pr < q * d.pricePence)));
  if (badOffer) go(here, "invalid");
  const row = {
    slug: d.slug, category: d.category, name_en: d.nameEn, name_ro: d.nameRo, note_en: d.noteEn, note_ro: d.noteRo,
    desc_en: d.descEn, desc_ro: d.descRo, format_en: d.formatEn, format_ro: d.formatRo, price_pence: d.pricePence,
    multi_qty: d.multiQty, multi_price_pence: d.multiPricePence,
    multi2_qty: d.multi2Qty, multi2_price_pence: d.multi2PricePence,
    multi3_qty: d.multi3Qty, multi3_price_pence: d.multi3PricePence,
    stock: d.stock, active: d.active, tag: d.tag, art_kind: d.artKind, art_color: d.artColor, art_wax: d.artWax, images: d.images, colors: d.colors, updated_at: new Date().toISOString(),
  };
  let finalSlug = d.slug;
  if (editing) {
    const { data: before } = await db().from("products").select("images").eq("id", idRaw).maybeSingle();
    const { error } = await db().from("products").update(row).eq("id", idRaw);
    if (error) go(here, error.code === "23505" ? "slug_taken" : "err");
    // Photos taken out of the product are deleted from storage too (best effort).
    const gone = (Array.isArray(before?.images) ? (before.images as string[]) : []).filter((f) => !d.images.includes(f));
    if (gone.length) await db().storage.from("product-images").remove(gone);
  } else {
    const { data: last } = await db().from("products").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
    // If the generated address is already used, try name-2, name-3 ... (an address typed by hand is never changed).
    for (let n = 2; ; n++) {
      const { error } = await db().from("products").insert({ ...row, slug: finalSlug, sort: (last?.sort ?? 0) + 10 });
      if (!error) break;
      if (error.code !== "23505") go(here, "err");
      if (typedSlug || n > 6) go(here, "slug_taken");
      finalSlug = `${d.slug.slice(0, 56)}-${n}`;
    }
  }
  await audit("admin", editing ? "product_edit" : "product_create", { slug: finalSlug });
  go("/admin/products", "saved");
}

/* ───────── messages & GDPR requests ───────── */
export async function toggleRepliedAction(fd: FormData): Promise<void> {
  await requireAdminAction();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) go("/admin/messages", "err");
  await db().from("contact_messages").update({ replied: fd.get("to") === "1" }).eq("id", id.data);
  go("/admin/messages", "saved");
}

export async function completeRequestAction(fd: FormData): Promise<void> {
  await requireAdminAction();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) go("/admin/requests", "err");
  await db().from("data_requests").update({ status: "done", done_at: new Date().toISOString() }).eq("id", id.data);
  await audit("admin", "request_done", { id: id.data });
  go("/admin/requests", "saved");
}

export async function addRequestAction(fd: FormData): Promise<void> {
  await requireAdminAction();
  const p = z.object({ email: z.string().trim().toLowerCase().email().max(254), kind: z.enum(["export", "delete", "other"]), note: z.string().trim().max(500) }).safeParse({ email: fd.get("email"), kind: fd.get("kind"), note: fd.get("note") ?? "" });
  if (!p.success) go("/admin/requests", "invalid");
  await db().from("data_requests").insert({ email: p.data.email, kind: p.data.kind, note: p.data.note });
  go("/admin/requests", "saved");
}

/* ───────── settings & closures ───────── */
export async function saveSettingsAction(fd: FormData): Promise<void> {
  await requireAdminAction();
  const cur = await getSettings();
  const parsed = settingsInput.safeParse({
    shippingPence: poundsToPence(fd.get("shipping")),
    freeThresholdPence: poundsToPence(fd.get("freeOver")),
    workingDays: fd.getAll("days").map((d) => Number(d)),
    startHour: int(fd.get("startHour")), endHour: int(fd.get("endHour")), cutoffHour: int(fd.get("cutoffHour")),
    leadMinDays: int(fd.get("leadMin")), leadMaxDays: int(fd.get("leadMax")), dailyCap: int(fd.get("dailyCap")),
    manualPause: fd.get("manualPause") === "on",
    closures: cur.schedule.closures,
  });
  if (!parsed.success) go("/admin/settings", "invalid");
  const s = parsed.data;
  const schedule: Schedule = { ...cur.schedule, workingDays: [...new Set(s.workingDays)].sort(), startHour: s.startHour, endHour: s.endHour, cutoffHour: s.cutoffHour, leadMinDays: s.leadMinDays, leadMaxDays: s.leadMaxDays, dailyCap: s.dailyCap };
  if (validateSchedule(schedule).length) go("/admin/settings", "invalid");
  const { error } = await db().from("settings").update({ shipping_pence: s.shippingPence, free_over_pence: s.freeThresholdPence, manual_pause: s.manualPause, schedule, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) go("/admin/settings", "err");
  await audit("admin", "settings_saved", { pause: s.manualPause });
  go("/admin/settings", "saved");
}

async function writeClosures(closures: Closure[]): Promise<boolean> {
  const cur = await getSettings();
  const schedule: Schedule = { ...cur.schedule, closures };
  if (validateSchedule(schedule).length) return false;
  const { error } = await db().from("settings").update({ schedule, updated_at: new Date().toISOString() }).eq("id", 1);
  return !error;
}

export async function addClosureAction(fd: FormData): Promise<void> {
  await requireAdminAction();
  const from = String(fd.get("from") ?? "");
  const to = String(fd.get("to") ?? "");
  const mode = fd.get("mode") === "paused" ? "paused" : "open";
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) go("/admin/settings", "invalid");
  const note = String(fd.get("note") ?? "").trim().slice(0, 200);
  const noteEn = String(fd.get("noteEn") ?? "").trim().slice(0, 200);
  const cur = await getSettings();
  if (cur.schedule.closures.length >= 40) go("/admin/settings", "invalid");
  const closures = [...cur.schedule.closures, { from, to, mode, noteRo: note || undefined, noteEn: noteEn || undefined } as Closure].sort((a, b) => a.from.localeCompare(b.from));
  go("/admin/settings", (await writeClosures(closures)) ? "saved" : "invalid");
}

export async function removeClosureAction(fd: FormData): Promise<void> {
  await requireAdminAction();
  const i = int(fd.get("index"));
  const cur = await getSettings();
  if (!Number.isFinite(i) || i >= cur.schedule.closures.length) go("/admin/settings", "err");
  const closures = cur.schedule.closures.filter((_, k) => k !== i);
  go("/admin/settings", (await writeClosures(closures)) ? "saved" : "err");
}
