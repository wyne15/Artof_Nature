const COMMON = new Set([
  "password", "password1", "password12", "password123", "1234567890", "12345678910", "qwertyuiop", "qwerty12345",
  "iloveyou12", "letmein1234", "welcome1234", "admin12345", "administrator", "abc1234567", "1q2w3e4r5t", "0123456789",
  "passw0rd123", "monkey12345", "dragon12345", "football123", "baseball123",
]);

export type PasswordCheck = { ok: true } | { ok: false; reason: "too_short" | "too_long" | "too_common" | "too_simple" | "contains_email" };

/** NIST-style: length first, block obvious weak choices, no composition rules. */
export function checkPassword(password: string, email = ""): PasswordCheck {
  if (password.length < 10) return { ok: false, reason: "too_short" };
  if (password.length > 128) return { ok: false, reason: "too_long" };
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return { ok: false, reason: "too_common" };
  if (new Set(lower).size < 5) return { ok: false, reason: "too_simple" };
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && lower.includes(local)) return { ok: false, reason: "contains_email" };
  return { ok: true };
}
