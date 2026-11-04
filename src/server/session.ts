import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { signToken, verifyToken } from "@/lib/token";
import { db } from "./db";
import { env } from "./env";

const SESSION_DAYS = 14;
export const SESSION_COOKIE = () => (env.isProd ? "__Host-aon_session" : "aon_session");
export const RESET_COOKIE = () => (env.isProd ? "__Host-aon_reset" : "aon_reset");

const baseCookie = () => ({ httpOnly: true, secure: env.isProd, sameSite: "lax" as const, path: "/" });

export type Session = {
  userId: string;
  email: string;
  firstName: string;
  marketing: boolean;
  address: { line1: string; line2: string; city: string; postcode: string };
};

type SessionPayload = { p: "sess"; sub: string; em: string; sv: number };

/** Call from route handlers or server actions only (cookies can't be written during rendering). */
export async function startSession(userId: string, email: string, sessionVersion: number): Promise<void> {
  const token = signToken({ p: "sess", sub: userId, em: email, sv: sessionVersion }, env.appSecret, SESSION_DAYS * 86400);
  (await cookies()).set(SESSION_COOKIE(), token, { ...baseCookie(), maxAge: SESSION_DAYS * 86400 });
}

export async function endSession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE(), "", { ...baseCookie(), maxAge: 0 });
}

/** Verifies the signature, then checks the account still exists and the session was not revoked. */
export const getSession = cache(async (): Promise<Session | null> => {
  if (!env.dbConfigured) return null;
  const raw = (await cookies()).get(SESSION_COOKIE())?.value;
  const t = verifyToken<SessionPayload>(raw, env.appSecret);
  if (!t || t.p !== "sess") return null;
  const { data } = await db()
    .from("profiles")
    .select("first_name, marketing_opt_in, session_version, address_line1, address_line2, address_city, address_postcode")
    .eq("id", t.sub)
    .maybeSingle();
  if (!data || data.session_version !== t.sv) return null;
  return {
    userId: t.sub,
    email: t.em,
    firstName: data.first_name,
    marketing: data.marketing_opt_in,
    address: { line1: data.address_line1, line2: data.address_line2, city: data.address_city, postcode: data.address_postcode },
  };
});

/** Short-lived permission to set a new password, issued after the emailed recovery link was verified. */
export async function startResetWindow(userId: string): Promise<void> {
  const token = signToken({ p: "reset", sub: userId }, env.appSecret, 15 * 60);
  (await cookies()).set(RESET_COOKIE(), token, { ...baseCookie(), maxAge: 15 * 60 });
}
export async function readResetWindow(): Promise<string | null> {
  const t = verifyToken<{ p: string; sub: string }>((await cookies()).get(RESET_COOKIE())?.value, env.appSecret);
  return t && t.p === "reset" ? t.sub : null;
}
export async function clearResetWindow(): Promise<void> {
  (await cookies()).set(RESET_COOKIE(), "", { ...baseCookie(), maxAge: 0 });
}
