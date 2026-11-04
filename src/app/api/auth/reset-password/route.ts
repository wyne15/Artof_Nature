import { checkPassword } from "@/lib/passwords";
import { resetPasswordBody } from "@/lib/validation";
import { revokeAllSessions } from "@/server/accounts";
import { db } from "@/server/db";
import { allow, audit, bad, ipHash, json, readJson } from "@/server/http";
import { clearResetWindow, readResetWindow } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req, resetPasswordBody);
  if (!parsed.ok) return parsed.res;
  if (!(await allow(`resetpw:${ipHash(req.headers)}`, 10, 900))) return bad("rate_limited", 429);

  const userId = await readResetWindow();
  if (!userId) return bad("reset_expired", 401);

  const { data: u } = await db().auth.admin.getUserById(userId);
  const pw = checkPassword(parsed.data.password, u?.user?.email ?? "");
  if (!pw.ok) return json({ ok: false, error: "weak_password", reason: pw.reason }, 422);

  const { error } = await db().auth.admin.updateUserById(userId, { password: parsed.data.password });
  if (error) return bad("server_error", 500);
  await revokeAllSessions(userId); // every device is signed out
  await clearResetWindow();
  await audit(`user:${userId}`, "password_reset");
  return json({ ok: true });
}
