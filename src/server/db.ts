import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } } as const;

let admin: SupabaseClient | undefined;
/** Service-role client. Bypasses RLS. SERVER ONLY: never import this from a client component. */
export function db(): SupabaseClient {
  admin ??= createClient(env.supabaseUrl, env.supabaseSecretKey, opts);
  return admin;
}

/** Fresh client with the publishable key for credential checks (sign-in, OTP). One per call: no shared session state. */
export function authClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabasePublishableKey, opts);
}
