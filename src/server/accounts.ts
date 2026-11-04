import "server-only";
import { db } from "./db";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function sessionVersionOf(userId: string): Promise<number> {
  const { data } = await db().from("profiles").select("session_version").eq("id", userId).maybeSingle();
  if (data) return data.session_version as number;
  await db().from("profiles").insert({ id: userId }).select();
  return 1;
}

export async function revokeAllSessions(userId: string): Promise<void> {
  const v = await sessionVersionOf(userId);
  await db().from("profiles").update({ session_version: v + 1 }).eq("id", userId);
}
