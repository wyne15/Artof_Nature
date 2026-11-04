import Link from "next/link";
import { businessTodos } from "@/config/site";
import { formatDate } from "@/lib/logistics";
import { formatGBP } from "@/lib/money";
import { requireAdmin } from "@/server/adminAuth";
import { listProducts } from "@/server/catalog";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { listOrdersByStatus } from "@/server/orders";
import { getShopInfo } from "@/server/settings";
import { OrderCard } from "@/components/AdminOrder";

export const dynamic = "force-dynamic";

const TODO_LABEL: Record<string, string> = { legalName: "numele tău legal / denumirea comercială", address: "adresa ta din UK", icoNumber: "numărul de înregistrare ICO" };

export default async function Overview() {
  await requireAdmin();
  const [orders, products, info, msgs, reqs] = await Promise.all([
    listOrdersByStatus(null, 200),
    listProducts({ includeInactive: true }),
    getShopInfo(),
    db().from("contact_messages").select("id", { count: "exact", head: true }).eq("replied", false),
    db().from("data_requests").select("id,email,kind,due_at").eq("status", "open").order("due_at"),
  ]);
  const toPack = orders.filter((o) => o.status === "paid" || o.status === "packed");
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const revenue = orders.filter((o) => ["paid", "packed", "dispatched", "delivered"].includes(o.status) && (o.paidAt ?? o.createdAt) >= monthStart).reduce((n, o) => n + o.totalPence, 0);
  const low = products.filter((p) => p.active && p.stock <= 5);
  const flagged = orders.filter((o) => o.needsAttention);
  const todos = businessTodos();
  const open = reqs.data ?? [];
  const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

  const warnings: string[] = [];
  if (todos.length) warnings.push(`Completează în src/config/site.ts: ${todos.map((t) => TODO_LABEL[t] ?? t).join(", ")}. Legea cere aceste date pe site.`);
  if (process.env.NEXT_PUBLIC_LEGAL_REVIEWED !== "true") warnings.push("Paginile legale sunt ciorne. Pune-le la verificat, apoi setează NEXT_PUBLIC_LEGAL_REVIEWED=true.");
  if (info.settings.shippingPence === 399) warnings.push("Costul livrării este încă valoarea provizorie (£3.99). Pune prețul real în Setări.");
  if (!env.resendKey) warnings.push("RESEND_API_KEY lipsește: emailurile către clienți nu se trimit.");

  return (
    <>
      <h1>Prezentare</h1>
      {info.status.state !== "open" && (
        <div className="warnbox">
          Magazinul este în stare <b>{info.status.state === "paused" ? "oprit" : "închis, dar primește comenzi"}</b> până pe {formatDate(info.status.resumeOn, "ro")}. <Link href="/admin/settings">Schimbă în Setări</Link>.
        </div>
      )}
      {warnings.length > 0 && (
        <div className="warnbox"><b>De făcut înainte de lansare</b><ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>
      )}
      <div className="stats">
        <Link className="stat" href="/admin/pack"><span>De ambalat</span><b>{toPack.length}</b><small>comenzi în așteptare</small></Link>
        <Link className="stat" href="/admin/orders"><span>Încasări luna aceasta</span><b>{formatGBP(revenue, "ro")}</b><small>înainte de comisioane</small></Link>
        <Link className="stat" href="/admin/products"><span>Stoc redus</span><b>{low.length}</b><small>5 sau mai puține</small></Link>
        <Link className="stat" href="/admin/messages"><span>Mesaje necitite</span><b>{msgs.count ?? 0}</b><small>de la clienți</small></Link>
      </div>

      <h2 className="h2s">Necesită atenție</h2>
      <div className="list">
        {flagged.map((o) => <OrderCard key={o.id} o={o} back="/admin" />)}
        {toPack.filter((o) => !o.needsAttention).slice(0, 5).map((o) => <OrderCard key={o.id} o={o} back="/admin" compact />)}
        {low.map((p) => <div className="li" key={p.id}><div><b>{p.nameRo}</b><small>Au mai rămas {p.stock} în stoc</small></div><span className="pill warn">Stoc redus</span></div>)}
        {open.map((r) => <div className="li" key={r.id}><div><b>Cerere GDPR: {r.kind === "delete" ? "ștergere" : r.kind === "export" ? "export" : "altceva"}</b> {r.email}<small>Răspuns în maximum {Math.max(daysLeft(r.due_at), 0)} zile</small></div><Link className="btn btn-line sm" href="/admin/requests">Deschide</Link></div>)}
        {flagged.length + toPack.length + low.length + open.length === 0 && <div className="li"><div>Totul este la zi.</div></div>}
      </div>
      <p className="alt2"><Link href="/admin/export/orders">Descarcă comenzile (CSV)</Link> · <Link href="/admin/export/newsletter">Descarcă abonații confirmați (CSV)</Link></p>
    </>
  );
}
