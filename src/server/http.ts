import "server-only";
import type { ZodType } from "zod";
import { sha256Hex } from "@/lib/token";
import { db } from "./db";
import { env } from "./env";

export const noStore = { "Cache-Control": "no-store" } as const;

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { ...noStore, ...extra } });
}
export const bad = (error: string, status = 400) => json({ ok: false, error }, status);

type HeaderGetter = { get(name: string): string | null };

export function clientIp(h: HeaderGetter): string {
  const fwd = h.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return first || h.get("x-real-ip") || "unknown";
}

/** We never store raw IP addresses, only a salted hash (enough for rate limits and abuse checks). */
export function ipHash(h: HeaderGetter): string {
  return sha256Hex(`${env.ipSalt}:${clientIp(h)}`).slice(0, 32);
}

/** Returns true when the caller is still within the limit. Fails CLOSED if the database cannot be reached. */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await db().rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("rate_limit_hit failed", error.message);
    return false;
  }
  return data === true;
}

export async function readJson<T>(req: Request, schema: ZodType<T>, maxBytes = 20_000): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) return { ok: false, res: bad("unsupported_media_type", 415) };
  const text = await req.text();
  if (text.length > maxBytes) return { ok: false, res: bad("too_large", 413) };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, res: bad("invalid_json") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "")))].filter(Boolean);
    return { ok: false, res: json({ ok: false, error: "invalid", fields }, 422) };
  }
  return { ok: true, data: parsed.data };
}

export async function audit(actor: string, action: string, detail: Record<string, unknown> = {}): Promise<void> {
  const { error } = await db().from("audit_log").insert({ actor, action, detail });
  if (error) console.error("audit failed", error.message);
}
