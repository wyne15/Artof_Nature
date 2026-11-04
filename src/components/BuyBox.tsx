"use client";

import { useEffect, useRef, useState } from "react";
import type { ColorView } from "@/lib/variants";
import { useCart } from "./cart/CartProvider";

type Props = {
  slug: string;
  stock: number;
  priceText: string;
  colors?: ColorView[];
  labels: { addToBag: string; outOfStock: string; qty: string; dec: string; inc: string; colour: string; chooseColour: string };
};

/** Quantity picker + add button + the sticky mobile bar on the product page. */
export function BuyBox({ slug, stock, priceText, colors = [], labels }: Props) {
  const { add } = useCart();
  const max = Math.min(9, stock);
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState("");
  const [warn, setWarn] = useState(false);
  const needColor = colors.length > 0;
  const chosen = colors.find((c) => c.id === color);
  const addNow = () => {
    if (needColor && !chosen) {
      setWarn(true);
      return;
    }
    setWarn(false);
    add(slug, qty, color);
  };
  if (stock <= 0) {
    return (
      <div className="buy">
        <button type="button" className="btn btn-olive main" disabled aria-disabled="true">{labels.outOfStock}</button>
      </div>
    );
  }
  return (
    <>
      {needColor && (
        <fieldset className="colors">
          <legend>{labels.colour}{chosen ? <>: <b>{chosen.name}</b></> : null}</legend>
          <div className="swatches">
            {colors.map((c) => (
              <label key={c.id} className={`sw${color === c.id ? " on" : ""}`} title={c.name}>
                <input type="radio" name="color" value={c.id} checked={color === c.id} onChange={() => { setColor(c.id); setWarn(false); }} />
                <i style={{ background: c.hex }} aria-hidden="true" />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
          <p className="colorwarn" role="alert">{warn && !chosen ? labels.chooseColour : ""}</p>
        </fieldset>
      )}
      <div className="buy">
        <div className="qty" role="group" aria-label={labels.qty}>
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={labels.dec}>−</button>
          <span aria-live="polite">{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label={labels.inc}>+</button>
        </div>
        <button type="button" className="btn btn-olive main" onClick={addNow}>
          <svg width="20" height="20" aria-hidden="true"><use href="#beeico" /></svg>
          {labels.addToBag}
        </button>
      </div>
      <div className="sticky">
        <span className="sp">{priceText}</span>
        <button type="button" className="btn btn-olive" onClick={addNow}>{labels.addToBag}</button>
      </div>
    </>
  );
}

/** Swipeable gallery with position dots. */
export function Gallery({ children, count }: { children: React.ReactNode; count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => setI(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);
  return (
    <div>
      <div className="gal" ref={ref}>{children}</div>
      <div className="dots" aria-hidden="true">
        {Array.from({ length: count }, (_, k) => (
          <i key={k} className={k === i ? "on" : ""} />
        ))}
      </div>
    </div>
  );
}
