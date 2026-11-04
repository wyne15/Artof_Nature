import { addressBody } from "@/lib/validation";
import { db } from "@/server/db";
import { bad, json, readJson } from "@/server/http";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return bad("unauthorized", 401);
  const parsed = await readJson(req, addressBody);
  if (!parsed.ok) return parsed.res;
  const a = parsed.data;
  const { error } = await db()
    .from("profiles")
    .update({ address_line1: a.line1, address_line2: a.line2, address_city: a.city, address_postcode: a.postcode })
    .eq("id", s.userId);
  if (error) return bad("server_error", 500);
  return json({ ok: true });
}
