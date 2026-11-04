import { after } from "next/server";
import { SITE } from "@/config/site";
import { checkPassword } from "@/lib/passwords";
import { registerBody } from "@/lib/validation";
import { db } from "@/server/db";
import { confirmAccountEmail, sendEmail } from "@/server/email";
import { env } from "@/server/env";
import { allow, bad, ipHash, json, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req, registerBody);
  if (!parsed.ok) return parsed.res;
  const { firstName, email, password, marketing, locale } = parsed.data;

  if (!(await allow(`reg:ip:${ipHash(req.headers)}`, 6, 3600)) || !(await allow(`reg:em:${email}`, 3, 3600))) return bad("rate_limited", 429);

  const pw = checkPassword(password, email);
  if (!pw.ok) return json({ ok: false, error: "weak_password", reason: pw.reason }, 422);

  // generateLink(type "signup") creates the user (unconfirmed) and gives us the token; WE send the email in the visitor's language.
  const { data, error } = await db().auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { first_name: firstName, terms_version: SITE.policyVersion, marketing } },
  });

  // Same answer whether or not the address already has an account: no account enumeration.
  if (!error && data?.properties?.hashed_token) {
    const url = `${env.siteUrl}/${locale}/account/confirm?type=signup&th=${encodeURIComponent(data.properties.hashed_token)}`;
    after(() => sendEmail(confirmAccountEmail(email, firstName, url, locale)));
  }
  return json({ ok: true });
}
