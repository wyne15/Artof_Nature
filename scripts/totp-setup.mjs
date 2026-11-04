// Generates a secret for the admin two-step verification.
// Usage: npm run totp:setup -- you@example.com
// Put the printed secret in ADMIN_TOTP_SECRET, then add the otpauth link to your authenticator app
// (Google Authenticator, Microsoft Authenticator, 1Password, ...) by typing the secret in manually.
import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(buf) {
  let bits = 0, value = 0, out = "";
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

const account = process.argv[2] || "owner@example.com";
const secret = base32(randomBytes(20));
const uri = `otpauth://totp/${encodeURIComponent("The Art of Nature")}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent("The Art of Nature")}&algorithm=SHA1&digits=6&period=30`;

console.log("\nADMIN_TOTP_SECRET=" + secret);
console.log("\nAuthenticator link (paste into a QR generator ONLY on your own device, or type the secret in manually):");
console.log(uri + "\n");
console.log("Also generate the other two secrets:");
console.log("APP_SECRET=" + randomBytes(48).toString("base64url"));
console.log("ADMIN_SESSION_SECRET=" + randomBytes(48).toString("base64url"));
console.log("IP_HASH_SALT=" + randomBytes(24).toString("base64url") + "\n");
