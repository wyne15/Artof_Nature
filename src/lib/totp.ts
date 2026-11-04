import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("invalid_base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/** RFC 4226 HOTP with SHA-1. */
export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = (hmac[hmac.length - 1] as number) & 0x0f;
  const bin =
    (((hmac[offset] as number) & 0x7f) << 24) |
    (((hmac[offset + 1] as number) & 0xff) << 16) |
    (((hmac[offset + 2] as number) & 0xff) << 8) |
    ((hmac[offset + 3] as number) & 0xff);
  return String(bin % 10 ** digits).padStart(digits, "0");
}

export function totpAt(secretBase32: string, timeMs: number, step = 30, digits = 6): string {
  return hotp(base32Decode(secretBase32), Math.floor(timeMs / 1000 / step), digits);
}

/**
 * Returns the matched time-step number (for replay protection) or null.
 * Accepts +-window steps to tolerate clock drift.
 */
export function verifyTotp(secretBase32: string, code: string, timeMs = Date.now(), window = 1, step = 30): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  let secret: Buffer;
  try {
    secret = base32Decode(secretBase32);
  } catch {
    return null;
  }
  const current = Math.floor(timeMs / 1000 / step);
  let matched: number | null = null;
  for (let w = -window; w <= window; w++) {
    const candidate = hotp(secret, current + w);
    const a = Buffer.from(candidate);
    const b = Buffer.from(code);
    // evaluate every window (no early exit) to keep timing uniform
    if (a.length === b.length && timingSafeEqual(a, b)) matched = current + w;
  }
  return matched;
}

export function otpauthUri(secretBase32: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
