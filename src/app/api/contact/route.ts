import { after } from "next/server";
import { SITE } from "@/config/site";
import { contactBody } from "@/lib/validation";
import { db } from "@/server/db";
import { ownerContactEmail, sendEmail } from "@/server/email";
import { allow, bad, ipHash, json, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req, contactBody);
  if (!parsed.ok) return parsed.res;
  const d = parsed.data;

  // Bots: filled the hidden field or submitted impossibly fast. Pretend it worked, store nothing.
  if ((d.website ?? "") !== "" || (d.elapsedMs !== undefined && d.elapsedMs < 2500)) return json({ ok: true });

  const ip = ipHash(req.headers);
  if (!(await allow(`contact:ip:${ip}`, 5, 3600)) || !(await allow(`contact:em:${d.email}`, 5, 86400))) return bad("rate_limited", 429);

  const { error } = await db().from("contact_messages").insert({
    name: d.name, email: d.email, topic: d.topic, message: d.message, locale: d.locale, ip_hash: ip, consent_version: SITE.policyVersion,
  });
  if (error) return bad("server_error", 500);
  after(() => sendEmail(ownerContactEmail({ name: d.name, email: d.email, topic: d.topic, message: d.message })));
  return json({ ok: true });
}
