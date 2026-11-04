import { db } from "@/server/db";
import { allow, bad, ipHash } from "@/server/http";
import { listOrdersForUser } from "@/server/orders";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

/** GDPR right of access / portability: everything we hold about the signed-in person, as a JSON file. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return bad("unauthorized", 401);
  if (!(await allow(`export:${s.userId}`, 5, 3600)) || !(await allow(`export:ip:${ipHash(req.headers)}`, 20, 3600))) return bad("rate_limited", 429);

  const [orders, news, msgs] = await Promise.all([
    listOrdersForUser(s.userId, s.email),
    db().from("newsletter_subscribers").select("email,status,consent_at,confirmed_at,unsubscribed_at,locale").eq("email", s.email),
    db().from("contact_messages").select("name,email,topic,message,created_at").eq("email", s.email),
  ]);
  await db().from("data_requests").insert({ user_id: s.userId, email: s.email, kind: "export", status: "done", done_at: new Date().toISOString() });

  const body = {
    exportedAt: new Date().toISOString(),
    account: { email: s.email, firstName: s.firstName, marketingEmails: s.marketing, address: s.address },
    orders: orders.map((o) => ({
      reference: `AON-${o.number}`, status: o.status, placedAt: o.paidAt ?? o.createdAt, total: o.totalPence / 100,
      shipping: o.shippingPence / 100, deliveryAddress: [o.shipName, o.shipLine1, o.shipLine2, o.shipCity, o.shipPostcode],
      tracking: o.tracking, items: o.items.map((i) => ({ name: i.nameEn, colour: i.colorEn || null, quantity: i.qty, unitPrice: i.unitPence / 100 })),
    })),
    newsletter: news.data ?? [],
    contactMessages: msgs.data ?? [],
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="my-data-the-art-of-nature.json"', "Cache-Control": "no-store" },
  });
}
