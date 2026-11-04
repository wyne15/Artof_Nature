"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { productArt, type ArtInput } from "@/lib/art";
import { formatDate } from "@/lib/logistics";
import { amountToFreeShipping, formatGBP, normalizeOffers, offersLabel, shippingFor, unitPrices, type Locale } from "@/lib/money";
import type { Dict } from "@/i18n";
import { fmt } from "@/i18n/fmt";
import { COLOR_ID, type ColorView } from "@/lib/variants";
import { Svg } from "../Svg";

export type CartProduct = { slug: string; name: string; pricePence: number; stock: number; art: ArtInput; colors: ColorView[]; image: string; multiQty?: number; multiPricePence?: number; multi2Qty?: number; multi2PricePence?: number; multi3Qty?: number; multi3PricePence?: number };
type Labels = { cart: Dict["cart"]; nav: Dict["nav"] };
type CartLine = { slug: string; color: string; qty: number };
const lineKey = (l: { slug: string; color: string }) => `${l.slug}|${l.color}`;
type StatusInfo = {
  status: { state: "open" | "away" | "paused" };
  estimate: { earliest: string; latest: string };
  shippingPence: number;
  freeThresholdPence: number;
};

type Ctx = { count: number; add: (slug: string, qty?: number, color?: string) => boolean; open: () => void; clear: () => void; lang: Locale; labels: Labels };
const CartCtx = createContext<Ctx | null>(null);

export function useCart(): Ctx {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}

const KEY = "aon-cart-v2";
const MAX_QTY = 20;

function readStored(valid: Map<string, CartProduct>): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    const out: CartLine[] = [];
    const used = new Map<string, number>();
    for (const r of raw) {
      if (!r || typeof r !== "object") continue;
      const { slug, color, qty } = r as Record<string, unknown>;
      if (typeof slug !== "string" || typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) continue;
      const p = valid.get(slug);
      if (!p) continue;
      const c = typeof color === "string" && COLOR_ID.test(color) ? color : "";
      // A product with colours needs a colour that still exists; one without must not carry any.
      if (p.colors.length > 0 ? !p.colors.some((x) => x.id === c) : c !== "") continue;
      if (out.some((l) => l.slug === slug && l.color === c)) continue;
      const room = Math.min(MAX_QTY, Math.max(p.stock, 0)) - (used.get(slug) ?? 0);
      if (room < 1) continue;
      const q = Math.min(qty, room);
      used.set(slug, (used.get(slug) ?? 0) + q);
      out.push({ slug, color: c, qty: q });
    }
    return out;
  } catch {
    return [];
  }
}

export function CartProvider(props: {
  children: ReactNode;
  lang: Locale;
  products: CartProduct[];
  shippingPence: number;
  freeThresholdPence: number;
  signedIn: boolean;
  labels: Labels;
}) {
  const { lang, products, labels, signedIn } = props;
  const byslug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [info, setInfo] = useState<StatusInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setItems(readStored(byslug));
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(readStored(byslug));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [byslug]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* private mode: the bag simply won't survive a reload */
    }
  }, [items, ready]);

  const lines = useMemo(
    () =>
      items
        .map((l) => {
          const p = byslug.get(l.slug);
          return p ? { p, color: p.colors.find((c) => c.id === l.color), colorId: l.color, qty: l.qty, key: lineKey(l) } : null;
        })
        .filter((l): l is NonNullable<typeof l> => l !== null),
    [items, byslug],
  );
  const count = lines.reduce((n, l) => n + l.qty, 0);

  /* "N for £X" offers: same rule as the server (all colours of one product count together).
     Each line gets its share of the price, plus a short note about the offer. */
  const priced = useMemo(() => {
    const qtyBySlug = new Map<string, number>();
    for (const l of lines) qtyBySlug.set(l.p.slug, (qtyBySlug.get(l.p.slug) ?? 0) + l.qty);
    const units = new Map<string, number[]>();
    const used = new Map<string, number>();
    const noted = new Set<string>();
    const ro = lang === "ro";
    return lines.map((l) => {
      const p = l.p;
      const offers = [{ qty: p.multiQty ?? 0, pricePence: p.multiPricePence ?? 0 }, { qty: p.multi2Qty ?? 0, pricePence: p.multi2PricePence ?? 0 }, { qty: p.multi3Qty ?? 0, pricePence: p.multi3PricePence ?? 0 }];
      const all = qtyBySlug.get(p.slug) ?? l.qty;
      let u = units.get(p.slug);
      if (!u) {
        u = unitPrices(p.pricePence, all, offers);
        units.set(p.slug, u);
      }
      const at = used.get(p.slug) ?? 0;
      used.set(p.slug, at + l.qty);
      const total = u.slice(at, at + l.qty).reduce((a, b) => a + b, 0);
      let note = "";
      let applied = false;
      const tiers = normalizeOffers(p.pricePence, offers);
      if (tiers.length > 0 && !noted.has(p.slug)) {
        const offer = tiers[0]!;
        noted.add(p.slug);
        const deal = offersLabel(p.pricePence, all >= offer.qty ? tiers.filter((o) => o.qty <= all) : [offer], lang);
        if (all >= offer.qty) {
          applied = true;
          note = ro ? `Ofertă aplicată: ${deal}` : `Offer applied: ${deal}`;
        } else {
          const need = offer.qty - (all % offer.qty);
          if (all + need <= Math.min(MAX_QTY, p.stock)) note = ro ? `Mai adaugă ${need} și plătești ${deal}` : `Add ${need} more and pay ${deal}`;
        }
      }
      return { ...l, total, full: p.pricePence * l.qty, note, applied };
    });
  }, [lines, lang]);
  const subtotal = priced.reduce((n, l) => n + l.total, 0);

  const add = useCallback(
    (slug: string, qty = 1, color = "") => {
      const p = byslug.get(slug);
      if (!p || p.stock <= 0) return false;
      if (p.colors.length > 0 ? !p.colors.some((c) => c.id === color) : color !== "") return false;
      setItems((cur) => {
        const others = cur.filter((l) => l.slug === slug && l.color !== color).reduce((n, l) => n + l.qty, 0);
        const room = Math.min(MAX_QTY, p.stock) - others;
        const have = cur.find((l) => l.slug === slug && l.color === color);
        const q = Math.min((have?.qty ?? 0) + qty, room);
        if (q < 1) return cur;
        return have ? cur.map((l) => (l === have ? { ...l, qty: q } : l)) : [...cur, { slug, color, qty: q }];
      });
      setErr("");
      lastFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
      return true;
    },
    [byslug],
  );
  const open = useCallback(() => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    lastFocus.current?.focus?.();
  }, []);

  const setQty = (key: string, qty: number) =>
    setItems((cur) => {
      const line = cur.find((l) => lineKey(l) === key);
      const p = line ? byslug.get(line.slug) : undefined;
      if (!line || !p) return cur;
      if (qty <= 0) return cur.filter((l) => l !== line);
      const others = cur.filter((l) => l.slug === line.slug && l !== line).reduce((n, l) => n + l.qty, 0);
      const q = Math.min(qty, Math.min(MAX_QTY, p.stock) - others);
      return q < 1 ? cur.filter((l) => l !== line) : cur.map((l) => (l === line ? { ...l, qty: q } : l));
    });

  /* When the bag opens: load the live posting estimate and move focus inside. */
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => closeRef.current?.focus(), 50);
    const ctl = new AbortController();
    fetch("/api/shop-status", { signal: ctl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.ok && setInfo(j as StatusInfo))
      .catch(() => {});
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && drawerRef.current) {
        const f = drawerRef.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex='-1'])");
        if (f.length === 0) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const rules = { shippingPence: info?.shippingPence ?? props.shippingPence, freeThresholdPence: info?.freeThresholdPence ?? props.freeThresholdPence };
  const free = formatGBP(rules.freeThresholdPence, lang);
  const ship = formatGBP(rules.shippingPence, lang);
  const away = amountToFreeShipping(subtotal, rules);
  const pct = rules.freeThresholdPence > 0 ? Math.min(100, Math.round((subtotal / rules.freeThresholdPence) * 100)) : 100;
  const paused = info?.status.state === "paused";
  const c = labels.cart;

  async function checkout() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines.map((l) => ({ slug: l.p.slug, qty: l.qty, ...(l.colorId ? { color: l.colorId } : {}) })), locale: lang }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (res.ok && j.ok && j.url) {
        window.location.assign(j.url);
        return;
      }
      setErr(j.error === "out_of_stock" || j.error === "unknown_product" || j.error === "color_required" || j.error === "unknown_color" ? c.errOut : j.error === "shop_paused" ? c.errPaused : j.error === "rate_limited" ? c.errRate : c.errGeneric);
    } catch {
      setErr(c.errGeneric);
    }
    setBusy(false);
  }

  const clear = useCallback(() => setItems([]), []);
  const ctx = useMemo<Ctx>(() => ({ count: ready ? count : 0, add, open, clear, lang, labels }), [count, ready, add, open, clear, lang, labels]);

  return (
    <CartCtx.Provider value={ctx}>
      {props.children}
      <div id="ovl" hidden={!isOpen} onClick={close} />
      <aside id="drawer" ref={drawerRef} className={isOpen ? "open" : ""} role="dialog" aria-modal="true" aria-labelledby="dTitle" aria-hidden={!isOpen} inert={!isOpen}>
        <div className="d-head">
          <h2 id="dTitle">{c.title}</h2>
          <button type="button" id="dClose" ref={closeRef} onClick={close} aria-label={c.close}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="d-ship">
          {count === 0 ? (
            fmt(c.freeNone, { free })
          ) : away === 0 ? (
            <>
              <b style={{ fontWeight: 600 }}>{c.freeYes}</b>
              <div className="bar"><i style={{ width: "100%" }} /></div>
            </>
          ) : (
            <>
              {fmt(c.freeAway, { amount: formatGBP(away, lang) })}
              <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            </>
          )}
        </div>
        <div className="d-body">
          {priced.length === 0 ? (
            <div className="empty">
              <h3>{c.empty}</h3>
              <p>{c.emptyText}</p>
            </div>
          ) : (
            priced.map(({ p, color, qty, key, total, full, note, applied }) => (
              <div className="it" key={key}>
                <div className="th">{p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" width={72} height={90} />
                ) : (
                  <Svg html={productArt(p.art, 0)} />
                )}</div>
                <div>
                  <h4>{p.name}</h4>
                  {color && (
                    <p className="it-color"><i className="swatch" style={{ background: color.hex }} aria-hidden="true" />{color.name}</p>
                  )}
                  {note && <p className="it-offer" style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: applied ? "var(--olive)" : "var(--muted)" }}>{note}</p>}
                  <div className="q">
                    <button type="button" onClick={() => setQty(key, qty - 1)} aria-label={fmt(c.decItem, { name: p.name })}>−</button>
                    <span>{qty}</span>
                    <button type="button" onClick={() => setQty(key, qty + 1)} aria-label={fmt(c.incItem, { name: p.name })}>+</button>
                  </div>
                </div>
                <div>
                  <div className="ip">{total < full && <s style={{ opacity: 0.5, marginRight: 6, fontWeight: 400 }}>{formatGBP(full, lang)}</s>}{formatGBP(total, lang)}</div>
                  <button type="button" className="rm" onClick={() => setQty(key, 0)} aria-label={fmt(c.removeItem, { name: p.name })}>{c.remove}</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="d-foot">
          {priced.length === 0 ? (
            <a className="btn btn-olive" href={`/${lang}/shop`} onClick={close}>{c.shopBtn}</a>
          ) : (
            <>
              <div className="sub"><span>{c.subtotal}</span><b>{formatGBP(subtotal, lang)}</b></div>
              {info && !paused && (
                <p className="cart-est">{fmt(c.estimate, { from: formatDate(info.estimate.earliest, lang), to: formatDate(info.estimate.latest, lang) })}</p>
              )}
              <button type="button" className="btn btn-olive" id="co" onClick={checkout} disabled={busy || paused}>{busy ? c.checkingOut : c.checkout}</button>
              <div className="cart-err" role="alert">{paused ? c.errPaused : err}</div>
              <small id="cosm">{fmt(c.secure, { ship, free })}</small>
              {!signedIn && (
                <small>{c.guest} <a href={`/${lang}/account`} onClick={close}>{c.signIn}</a> {c.guestEnd}</small>
              )}
            </>
          )}
        </div>
      </aside>
    </CartCtx.Provider>
  );
}

/** For quick price display in other client components. */
export { shippingFor };
