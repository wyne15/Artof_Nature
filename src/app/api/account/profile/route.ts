import { profileBody } from "@/lib/validation";
import { db } from "@/server/db";
import { bad, json, readJson } from "@/server/http";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return bad("unauthorized", 401);
  const parsed = await readJson(req, profileBody);
  if (!parsed.ok) return parsed.res;
  const { firstName, marketing } = parsed.data;
  const patch: Record<string, unknown> = { first_name: firstName, marketing_opt_in: marketing };
  if (marketing && !s.marketing) patch.marketing_opt_in_at = new Date().toISOString();
  const { error } = await db().from("profiles").update(patch).eq("id", s.userId);
  if (error) return bad("server_error", 500);
  return json({ ok: true });
}
