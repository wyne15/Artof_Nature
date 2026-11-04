import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signToken, verifyToken } from "@/lib/token";
import { env } from "./env";

const IDLE_SECONDS = 30 * 60;
const MAX_SECONDS = 8 * 3600;
export const ADMIN_COOKIE = () => (env.isProd ? "__Host-aon_admin" : "aon_admin");

type AdminPayload = { p: "adm"; iat: number };

/** Issue or refresh the admin cookie. Idle timeout 30 min, hard limit 8 h from the original sign-in. */
export async function setAdminCookie(iatSeconds = Math.floor(Date.now() / 1000)): Promise<void> {
  const token = signToken({ p: "adm", iat: iatSeconds }, env.adminSessionSecret, IDLE_SECONDS);
  (await cookies()).set(ADMIN_COOKIE(), token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "strict",
    path: "/",
    maxAge: IDLE_SECONDS,
  });
}
export async function clearAdminCookie(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE(), "", { httpOnly: true, secure: env.isProd, sameSite: "strict", path: "/", maxAge: 0 });
}

async function readAdmin(): Promise<{ iat: number } | null> {
  const t = verifyToken<AdminPayload>((await cookies()).get(ADMIN_COOKIE())?.value, env.adminSessionSecret);
  if (!t || t.p !== "adm") return null;
  if (Date.now() / 1000 - t.iat > MAX_SECONDS) return null;
  return { iat: t.iat };
}

/** Use at the top of EVERY admin page and EVERY admin server action. */
export async function requireAdmin(): Promise<void> {
  if (!(await readAdmin())) redirect("/admin/login");
}

/** For server actions: also slides the idle timeout forward. */
export async function requireAdminAction(): Promise<void> {
  const a = await readAdmin();
  if (!a) redirect("/admin/login");
  await setAdminCookie(a.iat);
}

export async function isAdmin(): Promise<boolean> {
  return (await readAdmin()) !== null;
}
