import { after } from "next/server";
import { SITE } from "@/config/site";
import { signToken } from "@/lib/token";
import { newsletterBody } from "@/lib/validation";
import { db } from "@/server/db";
import { newsletterConfirmEmail, sendEmail } from "@/server/email";
import { env } from "@/server/env";
import { allow, bad, ipHash, json, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** Step 1 of double opt-in: store as "pending" and email a confirmation link. Nothing is sent to anyone who doesn't confirm. */
export async function POST(req: Request) {
  const parsed = await readJson(req, newsletterBody);
  if (!parsed.ok) return parsed.res;
  const { email, locale, website } = parsed.data;
  if (website) return json({ ok: true });

  const ip = ipHash(req.headers);
  if (!(await allow(`news:ip:${ip}`, 5, 3600)) || !(await allow(`news:em:${email}`, 3, 86400))) return bad("rate_limited", 429);

  const { data: existing } = await db().from("newsletter_subscribers").select("status").eq("email", email).maybeSingle();
  if (existing?.status !== "confirmed") {
    const { error } = await db().from("newsletter_subscribers").upsert(
      { email, locale, status: "pending", consent_version: SITE.policyVersion, consent_at: new Date().toISOString(), ip_hash: ip, unsubscribed_at: null },
      { onConflict: "email" },
    );
    if (error) return bad("server_error", 500);
    const token = signToken({ p: "nl", e: email }, env.appSecret, 7 * 86400);
    const url = `${env.siteUrl}/${locale}/newsletter/confirm?t=${encodeURIComponent(token)}`;
    after(() => sendEmail(newsletterConfirmEmail(email, url, locale)));
  }
  return json({ ok: true }); // same answer for new, pending and already-subscribed addresses
}
