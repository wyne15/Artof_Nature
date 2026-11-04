import "server-only";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}
function needSecret(name: string): string {
  const v = need(name);
  if (v.length < 32) throw new Error(`${name} must be at least 32 characters.`);
  return v;
}

/** Lazy getters so a missing optional integration only fails when it is actually used. */
export const env = {
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  },
  get dbConfigured() {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  },
  get supabaseUrl() {
    return need("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabasePublishableKey() {
    return need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
  get supabaseSecretKey() {
    return need("SUPABASE_SECRET_KEY");
  },
  get stripeSecretKey() {
    return need("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return need("STRIPE_WEBHOOK_SECRET");
  },
  get resendKey() {
    return process.env.RESEND_API_KEY || "";
  },
  get emailFrom() {
    return process.env.EMAIL_FROM || "Art of Nature <onboarding@resend.dev>";
  },
  get ownerEmail() {
    return need("OWNER_EMAIL").trim().toLowerCase();
  },
  get adminTotpSecret() {
    return need("ADMIN_TOTP_SECRET");
  },
  get adminSessionSecret() {
    return needSecret("ADMIN_SESSION_SECRET");
  },
  get appSecret() {
    return needSecret("APP_SECRET");
  },
  get ipSalt() {
    return needSecret("IP_HASH_SALT");
  },
};
