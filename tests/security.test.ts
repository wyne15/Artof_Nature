import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyTotp, totpAt, base32Encode, generateSecret } from "../src/lib/totp.ts";
import { signToken, verifyToken, safeEqual } from "../src/lib/token.ts";
import { checkPassword } from "../src/lib/passwords.ts";
import { MemoryRateLimiter } from "../src/lib/ratelimit-memory.ts";
import { escapeHtml, csvSafe, cleanText } from "../src/lib/escape.ts";

const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

test("TOTP matches RFC 6238 test vectors (last 6 digits)", () => {
  assert.equal(totpAt(RFC_SECRET, 59_000), "287082");
  assert.equal(totpAt(RFC_SECRET, 1_111_111_109_000), "081804");
  assert.equal(totpAt(RFC_SECRET, 1_234_567_890_000), "005924");
});

test("TOTP verify: window, wrong code, malformed", () => {
  const now = 1_234_567_890_000;
  const code = totpAt(RFC_SECRET, now);
  assert.equal(verifyTotp(RFC_SECRET, code, now), Math.floor(now / 30000));
  assert.equal(verifyTotp(RFC_SECRET, code, now + 30_000), Math.floor(now / 30000)); // one step drift allowed
  assert.equal(verifyTotp(RFC_SECRET, code, now + 120_000), null); // too old
  assert.equal(verifyTotp(RFC_SECRET, "000000", now), null);
  assert.equal(verifyTotp(RFC_SECRET, "12345", now), null);
  assert.equal(verifyTotp("not base32 !!!", "123456", now), null);
  assert.match(generateSecret(), /^[A-Z2-7]{32}$/);
});

const SECRET = "x".repeat(48);
test("signed tokens: valid, expired, tampered, wrong secret", () => {
  const t = signToken({ uid: "u1" }, SECRET, 60, 1_000_000);
  assert.equal(verifyToken<{ uid: string }>(t, SECRET, 1_000_000 + 30_000)?.uid, "u1");
  assert.equal(verifyToken(t, SECRET, 1_000_000 + 61_000), null);
  assert.equal(verifyToken(t, "y".repeat(48), 1_000_000), null);
  const [body, sig] = t.split(".") as [string, string];
  const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: 9_999_999_999 })).toString("base64url");
  assert.equal(verifyToken(`${forged}.${sig}`, SECRET, 1_000_000), null);
  assert.equal(verifyToken(`${body}.`, SECRET, 1_000_000), null);
  assert.equal(verifyToken("garbage", SECRET), null);
  assert.equal(verifyToken(undefined, SECRET), null);
  assert.throws(() => signToken({}, "short", 60));
});

test("safeEqual", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
});

test("password policy", () => {
  assert.deepEqual(checkPassword("correct horse battery", "a@b.co"), { ok: true });
  assert.equal(checkPassword("short1", "").ok, false);
  assert.deepEqual(checkPassword("password123", ""), { ok: false, reason: "too_common" });
  assert.deepEqual(checkPassword("aaaaaaaaaaaa", ""), { ok: false, reason: "too_simple" });
  assert.deepEqual(checkPassword("maria.ionescu-2026", "maria.ionescu@example.com"), { ok: false, reason: "contains_email" });
  assert.deepEqual(checkPassword("x".repeat(129), ""), { ok: false, reason: "too_long" });
});

test("rate limiter blocks after max and recovers after the window", () => {
  const rl = new MemoryRateLimiter();
  for (let i = 0; i < 3; i++) assert.equal(rl.hit("k", 3, 60, 1000), true);
  assert.equal(rl.hit("k", 3, 60, 1000), false);
  assert.equal(rl.hit("other", 3, 60, 1000), true);
  assert.equal(rl.hit("k", 3, 60, 1000 + 61_000), true);
});

test("escaping", () => {
  assert.equal(escapeHtml(`<img src=x onerror="a()">&'`), "&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;");
  assert.equal(csvSafe("=HYPERLINK(\"x\")"), "'=HYPERLINK(\"x\")");
  assert.equal(csvSafe("normal"), "normal");
  assert.equal(cleanText("  hi\u0000there  ", 50), "hithere");
  assert.equal(cleanText("abcdef", 3), "abc");
});
