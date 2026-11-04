import { json } from "@/server/http";
import { endSession } from "@/server/session";

export async function POST() {
  await endSession();
  return json({ ok: true });
}
