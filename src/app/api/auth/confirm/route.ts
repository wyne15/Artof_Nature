import { confirmBody } from "@/lib/validation";
import { authClient, db } from "@/server/db";
import { allow, bad, ipHash, json, readJson } from "@/server/http";
import { startResetWindow } from "@/server/session";

export const dynamic = "force-dynamic";

/** Email links open a page with a button that POSTs here, so mail scanners that "click" links can't use up the token. */
export async function POST(req: Request) {
  const parsed = await readJson(req, confirmBody);
  if (!parsed.ok) return parsed.res;
  if (!(await allow(`confirm:${ipHash(req.headers)}`, 20, 900))) return bad("rate_limited", 429);

  const { data, error } = await authClient().auth.verifyOtp({ token_hash: parsed.data.tokenHash, type: parsed.data.type });
  const user = data?.user;
  if (error || !user) return bad("invalid_or_expired", 400);

  if (parsed.data.type === "signup") {
    if (user.user_metadata?.marketing === true) {
      await db().from("profiles").update({ marketing_opt_in: true, marketing_opt_in_at: new Date().toISOString() }).eq("id", user.id);
    }
    return json({ ok: true, next: "login" });
  }
  await startResetWindow(user.id);
  return json({ ok: true, next: "reset" });
}
