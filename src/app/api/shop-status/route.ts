import { json } from "@/server/http";
import { getShopInfo } from "@/server/settings";

export const dynamic = "force-dynamic";

/** Public, read-only: is the shop taking orders, and when will a new order be posted? */
export async function GET() {
  const info = await getShopInfo();
  return json({
    ok: true,
    status: info.status,
    estimate: info.estimate,
    shippingPence: info.settings.shippingPence,
    freeThresholdPence: info.settings.freeThresholdPence,
  });
}
