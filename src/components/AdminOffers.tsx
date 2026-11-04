"use client";

import { useEffect, useRef, useState } from "react";
import { formatGBP } from "@/lib/money";

type Offer = { qty: number; pricePence: number };
type Row = { qty: string; price: string };

/* Same field names the server already reads (multiQty/multiPrice, multi2…, multi3…). */
const NAMES = [
  ["multiQty", "multiPrice"],
  ["multi2Qty", "multi2Price"],
  ["multi3Qty", "multi3Price"],
] as const;

const box: React.CSSProperties = { border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: 16, display: "grid", gap: 12 };
const line: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 };
const inp: React.CSSProperties = { width: 92, fontSize: 16, minHeight: 44, padding: "0 10px" };

export function AdminOffers({ initial }: { initial: Offer[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial
      .filter((o) => o.qty > 0)
      .slice(0, 3)
      .map((o) => ({ qty: String(o.qty), price: (o.pricePence / 100).toFixed(2) })),
  );
  const [unit, setUnit] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  /* Follow the product price typed in the same form, to show the saving. */
  useEffect(() => {
    const form = wrap.current?.closest("form");
    const input = form?.elements.namedItem("price") as HTMLInputElement | null;
    if (!form || !input) return;
    const read = () => {
      const n = Number(String(input.value).replace(",", "."));
      setUnit(Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0);
    };
    read();
    form.addEventListener("input", read);
    return () => form.removeEventListener("input", read);
  }, []);

  const set = (i: number, patch: Partial<Row>) => setRows((cur) => cur.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows((cur) => cur.filter((_, k) => k !== i));

  function status(r: Row): { text: string; ok: boolean } | null {
    if (!r.qty.trim() && !r.price.trim()) return null;
    const q = parseInt(r.qty, 10);
    const pr = Math.round(Number(r.price.replace(",", ".")) * 100);
    if (!Number.isInteger(q) || q < 2 || q > 10 || !Number.isFinite(pr) || pr <= 0) return { text: "Completează ambele câmpuri (între 2 și 10 bucăți).", ok: false };
    if (unit <= 0) return null;
    const full = q * unit;
    if (pr < full) return { text: `${q} × ${formatGBP(unit)} = ${formatGBP(full)}. Clientul economisește ${formatGBP(full - pr)}.`, ok: true };
    return { text: `Oferta trebuie să fie mai ieftină decât ${formatGBP(full)}.`, ok: false };
  }

  return (
    <div ref={wrap} style={box}>
      <div>
        <b>Oferte de cantitate (opțional)</b>
        <div style={{ opacity: 0.75, fontSize: 14, marginTop: 4 }}>Exemplu: când cumpără 2 bucăți, plătesc £12.</div>
      </div>

      {rows.map((r, i) => {
        const s = status(r);
        return (
          <div key={i} style={{ display: "grid", gap: 6 }}>
            <div style={line}>
              <span>Când cumpără</span>
              <input name={NAMES[i]![0]} inputMode="numeric" value={r.qty} onChange={(e) => set(i, { qty: e.target.value })} placeholder="2" style={inp} aria-label={`Oferta ${i + 1}: număr de bucăți`} />
              <span>bucăți, plătesc £</span>
              <input name={NAMES[i]![1]} inputMode="decimal" value={r.price} onChange={(e) => set(i, { price: e.target.value })} placeholder="12.00" style={inp} aria-label={`Oferta ${i + 1}: preț total`} />
              <button type="button" onClick={() => remove(i)} style={{ minHeight: 44, padding: "0 12px", background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontSize: 15 }}>Șterge</button>
            </div>
            {s && <div style={{ fontSize: 14, fontWeight: 600, color: s.ok ? "var(--olive, #4a5d2a)" : "#a33" }}>{s.text}</div>}
          </div>
        );
      })}

      {rows.length < 3 && (
        <div>
          <button type="button" className="btn btn-olive" onClick={() => setRows((cur) => [...cur, { qty: "", price: "" }])}>
            + Adaugă {rows.length === 0 ? "o ofertă" : "încă o ofertă"}
          </button>
        </div>
      )}

      {/* unused slots are still sent (empty), so the server clears them */}
      {NAMES.slice(rows.length).map(([q, p]) => (
        <span key={q}>
          <input type="hidden" name={q} value="" />
          <input type="hidden" name={p} value="" />
        </span>
      ))}
    </div>
  );
}
