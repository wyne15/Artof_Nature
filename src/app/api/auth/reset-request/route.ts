import { after } from "next/server";
import { resetRequestBody } from "@/lib/validation";
import { db } from "@/server/db";
import { resetPasswordEmail, sendEmail } from "@/server/email";
import { env } from "@/server/env";
import { allow, bad, ipHash, json, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req, resetRequestBody);
  if (!parsed.ok) return parsed.res;
  const { email, locale } = parsed.data;
  if (!(await allow(`reset:ip:${ipHash(req.headers)}`, 6, 3600)) || !(await allow(`reset:em:${email}`, 3, 3600))) return bad("rate_limited", 429);

  const { data, error } = await db().auth.admin.generateLink({ type: "recovery", email });
  if (!error && data?.properties?.hashed_token) {
    const url = `${env.siteUrl}/${locale}/account/confirm?type=recovery&th=${encodeURIComponent(data.properties.hashed_token)}`;
    after(() => sendEmail(resetPasswordEmail(email, url, locale)));
  }
  return json({ ok: true }); // always the same answer
}
