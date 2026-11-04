export type Locale = "en" | "ro";

/** All money is stored and calculated as integer pence. */
export function formatGBP(pence: number, locale: Locale = "en"): string {
  const tag = locale === "ro" ? "ro-RO" : "en-GB";
  const amount = pence / 100;
  const fmt = new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return fmt.format(amount);
}

export type ShippingRules = { shippingPence: number; freeThresholdPence: number };

export function shippingFor(subtotalPence: number, rules: ShippingRules): number {
  if (subtotalPence <= 0) return 0;
  return subtotalPence >= rules.freeThresholdPence ? 0 : rules.shippingPence;
}

export type PricedLine = { unitPence: number; qty: number };

export function subtotalOf(lines: PricedLine[]): number {
  let total = 0;
  for (const l of lines) {
    if (!Number.isInteger(l.unitPence) || !Number.isInteger(l.qty) || l.unitPence < 0 || l.qty < 1) {
      throw new Error("invalid_line");
    }
    total += l.unitPence * l.qty;
  }
  return total;
}

export function amountToFreeShipping(subtotalPence: number, rules: ShippingRules): number {
  return Math.max(0, rules.freeThresholdPence - subtotalPence);
}

/** "N pieces for £X" offer on one product (qty 0 = no offer). */
export type Offer = { qty: number; pricePence: number };

/** An offer only counts when it really is cheaper than buying the pieces one by one. */
export function offerApplies(unitPence: number, offer?: Offer | null): offer is Offer {
  return Boolean(
    offer &&
      Number.isInteger(offer.qty) && offer.qty >= 2 && offer.qty <= 10 &&
      Number.isInteger(offer.pricePence) && offer.pricePence > 0 &&
      offer.pricePence < offer.qty * unitPence,
  );
}

/** Keeps only the valid offers (one per quantity, the cheapest), sorted by quantity. */
export function normalizeOffers(unitPence: number, offers?: Offer | Offer[] | null): Offer[] {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  const byQty = new Map<number, Offer>();
  for (const o of list) {
    if (!offerApplies(unitPence, o)) continue;
    const cur = byQty.get(o.qty);
    if (!cur || o.pricePence < cur.pricePence) byQty.set(o.qty, o);
  }
  return [...byQty.values()].sort((a, b) => a.qty - b.qty);
}

/**
 * Price of every single piece when buying `qty` pieces of one product (all colours together).
 * One offer or several: the cheapest way to combine them is used, e.g. with "2 for £12" and
 * "3 for £16", five pieces cost 3 for £16 + 2 for £12. Pieces not in any group cost the normal price.
 * The sum of the returned prices is exact (leftover pence go to the first pieces of a group).
 */
export function unitPrices(unitPence: number, qty: number, offers?: Offer | Offer[] | null): number[] {
  const list = normalizeOffers(unitPence, offers);
  const cost: number[] = [0];
  const pick: number[] = [0];
  for (let n = 1; n <= qty; n++) {
    let best = cost[n - 1]! + unitPence;
    let bestSize = 1;
    for (const o of list) {
      if (o.qty > n) continue;
      const c = cost[n - o.qty]! + o.pricePence;
      if (c < best) {
        best = c;
        bestSize = o.qty;
      }
    }
    cost[n] = best;
    pick[n] = bestSize;
  }
  const priceOf = new Map(list.map((o) => [o.qty, o.pricePence]));
  const groups: number[] = [];
  let singles = 0;
  for (let n = qty; n > 0; ) {
    const size = pick[n]!;
    if (size === 1) {
      singles++;
      n -= 1;
    } else {
      groups.push(size);
      n -= size;
    }
  }
  const out: number[] = [];
  for (const size of groups) {
    const total = priceOf.get(size)!;
    const base = Math.floor(total / size);
    const extra = total - base * size;
    for (let k = 0; k < size; k++) out.push(base + (k < extra ? 1 : 0));
  }
  for (let i = 0; i < singles; i++) out.push(unitPence);
  return out;
}

/** Total for `qty` pieces of one product, with the optional offer(s). */
export function productTotal(unitPence: number, qty: number, offers?: Offer | Offer[] | null): number {
  return unitPrices(unitPence, qty, offers).reduce((a, b) => a + b, 0);
}

/** "2 for £12 · 3 for £16" (only valid offers). */
export function offersLabel(unitPence: number, offers: Offer | Offer[] | null | undefined, locale: Locale = "en"): string {
  return normalizeOffers(unitPence, offers)
    .map((o) => (locale === "ro" ? `${o.qty} pentru ${formatGBP(o.pricePence, locale)}` : `${o.qty} for ${formatGBP(o.pricePence, locale)}`))
    .join(" · ");
}
