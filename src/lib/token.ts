import { createHmac, timingSafeEqual, randomBytes, createHash } from "node:crypto";

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

/** Signed, expiring token: base64url(payload).base64url(hmac). */
export function signToken(payload: Record<string, unknown>, secret: string, ttlSeconds: number, now = Date.now()): string {
  if (secret.length < 32) throw new Error("secret_too_short");
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(now / 1000) + ttlSeconds }));
  const sig = createHmac("sha256", secret).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string | undefined | null, secret: string, now = Date.now()): (T & { exp: number }) | null {
  if (!token || secret.length < 32) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  const expected = createHmac("sha256", secret).update(body).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp: number };
    if (typeof data.exp !== "number" || data.exp * 1000 < now) return null;
    return data;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
