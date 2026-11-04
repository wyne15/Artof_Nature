import { deleteAccountBody } from "@/lib/validation";
import { authClient, db } from "@/server/db";
import { allow, audit, bad, json, readJson } from "@/server/http";
import { endSession, getSession } from "@/server/session";

export const dynamic = "force-dynamic";

/**
 * GDPR right to erasure. Requires the password again.
 * Removed: login, profile, address, newsletter record, contact messages.
 * Kept (legal duty, HMRC ~6 years): the order records themselves, detached from the account.
 */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return bad("unauthorized", 401);
  const parsed = await readJson(req, deleteAccountBody);
  if (!parsed.ok) return parsed.res;
  if (!(await allow(`delete:${s.userId}`, 5, 3600))) return bad("rate_limited", 429);

  const check = await authClient().auth.signInWithPassword({ email: s.email, password: parsed.data.password });
  if (check.error) return bad("invalid_credentials", 401);

  await db().from("newsletter_subscribers").delete().eq("email", s.email);
  await db().from("contact_messages").delete().eq("email", s.email);
  await db().from("data_requests").insert({ user_id: null, email: "(deleted)", kind: "delete", status: "done", done_at: new Date().toISOString(), note: "Self-service deletion" });
  const { error } = await db().auth.admin.deleteUser(s.userId); // profile cascades; orders.user_id → NULL
  if (error) return bad("server_error", 500);
  await audit("user", "account_deleted", { userId: s.userId });
  await endSession();
  return json({ ok: true });
}
