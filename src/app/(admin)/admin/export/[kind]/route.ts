import { csvSafe } from "@/lib/escape";
import { isAdmin } from "@/server/adminAuth";
import { db } from "@/server/db";
import { audit } from "@/server/http";
import { listOrdersByStatus } from "@/server/orders";

export const dynamic = "force-dynamic";

const line = (cells: unknown[]) => cells.map((c) => `"${csvSafe(c).replace(/"/g, '""')}"`).join(",");

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (!(await isAdmin())) return new Response("Not found", { status: 404 });
  const { kind } = await params;
  const rows: string[] = [];

  if (kind === "orders") {
    rows.push(line(["Număr", "Data", "Status", "Nume", "Email", "Produse", "Subtotal £", "Livrare £", "Total £", "Adresă", "Urmărire"]));
    for (const o of await listOrdersByStatus(null, 1000)) {
      rows.push(line([`AON-${o.number}`, (o.paidAt ?? o.createdAt).slice(0, 10), o.status, o.name, o.email, o.items.map((i) => `${i.qty}x ${i.nameEn}`).join("; "), (o.subtotalPence / 100).toFixed(2), (o.shippingPence / 100).toFixed(2), (o.totalPence / 100).toFixed(2), [o.shipLine1, o.shipLine2, o.shipCity, o.shipPostcode].filter(Boolean).join(", "), o.tracking ?? ""]));
    }
  } else if (kind === "newsletter") {
    rows.push(line(["Email", "Limba", "Sursa", "Confirmat la"]));
    const { data: subs } = await db().from("newsletter_subscribers").select("email,locale,confirmed_at").eq("status", "confirmed");
    for (const s of subs ?? []) rows.push(line([s.email, s.locale, "newsletter", s.confirmed_at]));
    const { data: profs } = await db().from("profiles").select("id,marketing_opt_in_at").eq("marketing_opt_in", true).limit(1000);
    const seen = new Set((subs ?? []).map((s) => String(s.email).toLowerCase()));
    for (const p of profs ?? []) {
      const { data: u } = await db().auth.admin.getUserById(p.id);
      const em = u?.user?.email?.toLowerCase();
      if (em && !seen.has(em)) rows.push(line([em, "", "cont", p.marketing_opt_in_at]));
    }
  } else {
    return new Response("Not found", { status: 404 });
  }

  await audit("admin", "export", { kind });
  return new Response("﻿" + rows.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
