import "server-only";
import { cache } from "react";
import { DEFAULT_SCHEDULE, estimateDispatch, shopStatus, type DispatchEstimate, type Schedule, type ShopStatus } from "@/lib/logistics";
import { db } from "./db";
import { env } from "./env";

export type Settings = {
  shippingPence: number;
  freeThresholdPence: number;
  manualPause: boolean;
  schedule: Schedule;
};

export const DEFAULT_SETTINGS: Settings = {
  shippingPence: 399, // placeholder until the real postage price is known: change it in the admin
  freeThresholdPence: 4000,
  manualPause: false,
  schedule: DEFAULT_SCHEDULE,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const getSettings = cache(async (): Promise<Settings> => {
  if (!env.dbConfigured) return DEFAULT_SETTINGS;
  const { data, error } = await db().from("settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  const s = (data.schedule ?? {}) as Partial<Schedule>;
  return {
    shippingPence: data.shipping_pence,
    freeThresholdPence: data.free_over_pence,
    manualPause: data.manual_pause,
    schedule: { ...DEFAULT_SCHEDULE, ...s, closures: Array.isArray(s.closures) ? s.closures : [] },
  };
});

/** Orders already promised per dispatch date (paid or packed, not yet posted). */
export async function getDispatchLoad(): Promise<Record<string, number>> {
  if (!env.dbConfigured) return {};
  const { data } = await db().from("orders").select("dispatch_by").in("status", ["paid", "packed"]).not("dispatch_by", "is", null);
  const load: Record<string, number> = {};
  for (const r of (data ?? []) as any[]) load[r.dispatch_by] = (load[r.dispatch_by] ?? 0) + 1;
  return load;
}

export type ShopInfo = { status: ShopStatus; estimate: DispatchEstimate; settings: Settings };

export async function getShopInfo(now = new Date()): Promise<ShopInfo> {
  const settings = await getSettings();
  const load = await getDispatchLoad();
  return {
    settings,
    status: shopStatus(now, settings.schedule, settings.manualPause),
    estimate: estimateDispatch(now, settings.schedule, load),
  };
}
