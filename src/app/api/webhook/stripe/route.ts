import Stripe from "stripe";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { orderConfirmationEmail, ownerNewOrderEmail, sendEmail } from "@/server/email";
import { getOrder, toMail } from "@/server/orders";
import { getShopInfo } from "@/server/settings";

export const dynamic = "force-dynamic";

/**
 * Stripe → us. The ONLY place an order becomes "paid".
 * Protection: (1) the signature must verify against STRIPE_WEBHOOK_SECRET, (2) the database function records the
 * event id and the order change in ONE transaction, so retries and duplicates are safe.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });
  const raw = await req.text();

  const stripe = new Stripe(env.stripeSecretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, env.stripeWebhookSecret);
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status !== "paid") return new Response("ok");
      const orderId = s.client_reference_id ?? s.metadata?.order_id;
      if (!orderId) return new Response("no order", { status: 200 });

      const ship = s.collected_information?.shipping_details;
      const info = await getShopInfo();
      const { data, error } = await db().rpc("fulfil_order", {
        p_event_id: event.id,
        p_event_type: event.type,
        p_order_id: orderId,
        p_session_id: s.id,
        p_payment_intent: typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? ""),
        p_email: (s.customer_details?.email ?? "").toLowerCase(),
        p_ship_name: ship?.name ?? s.customer_details?.name ?? "",
        p_line1: ship?.address?.line1 ?? "",
        p_line2: ship?.address?.line2 ?? "",
        p_city: ship?.address?.city ?? "",
        p_postcode: ship?.address?.postal_code ?? "",
        p_dispatch_by: info.estimate.latest,
      });
      if (error) {
        console.error("fulfil_order", error.message);
        return new Response("db error", { status: 500 }); // Stripe will retry
      }

      if (data?.status === "paid" && data.order_id) {
        const order = await getOrder(data.order_id);
        if (order) {
          const mail = toMail(order, { earliest: info.estimate.earliest });
          await Promise.all([
            sendEmail(orderConfirmationEmail(mail)),
            sendEmail(ownerNewOrderEmail(mail, order.needsAttention ? order.attentionNote : "")),
          ]);
        }
      }
    } else if (event.type === "checkout.session.expired") {
      const s = event.data.object as Stripe.Checkout.Session;
      const orderId = s.client_reference_id ?? s.metadata?.order_id;
      if (orderId) await db().rpc("expire_order", { p_order_id: orderId });
    }
  } catch (e) {
    console.error("webhook", e instanceof Error ? e.message : e);
    return new Response("error", { status: 500 });
  }
  // housekeeping: old rate-limit rows, expired pending orders (Supabase calls only run when awaited)
  await db().rpc("purge_old_rows").then(() => undefined, () => undefined);
  return new Response("ok");
}
