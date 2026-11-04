import { loginBody } from "@/lib/validation";
import { sessionVersionOf } from "@/server/accounts";
import { authClient } from "@/server/db";
import { allow, bad, ipHash, json, readJson } from "@/server/http";
import { startSession } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req, loginBody);
  if (!parsed.ok) return parsed.res;
  const { email, password } = parsed.data;

  if (!(await allow(`login:ip:${ipHash(req.headers)}`, 15, 900)) || !(await allow(`login:em:${email}`, 8, 900))) return bad("rate_limited", 429);

  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return bad("email_not_confirmed", 401);
    return bad("invalid_credentials", 401); // identical message for "no such user" and "wrong password"
  }
  await startSession(data.user.id, (data.user.email ?? email).toLowerCase(), await sessionVersionOf(data.user.id));
  return json({ ok: true });
}
