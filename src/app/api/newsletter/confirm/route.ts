import { verifyToken } from "@/lib/token";
import { tokenBody } from "@/lib/validation";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { allow, bad, ipHash, json, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req, tokenBody);
  if (!parsed.ok) return parsed.res;
  if (!(await allow(`nlc:${ipHash(req.headers)}`, 20, 900))) return bad("rate_limited", 429);
  const t = verifyToken<{ p: string; e: string }>(parsed.data.token, env.appSecret);
  if (!t || t.p !== "nl") return bad("invalid_or_expired", 400);
  const { error } = await db()
    .from("newsletter_subscribers")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("email", t.e)
    .neq("status", "unsubscribed");
  if (error) return bad("server_error", 500);
  return json({ ok: true });
}
