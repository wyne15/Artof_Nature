"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart/CartProvider";

/** "Add to bag" on product cards. */
export function AddButton({ slug, inStock, label, addedLabel, soldOut }: { slug: string; inStock: boolean; label: string; addedLabel: string; soldOut: string }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (t.current && clearTimeout(t.current)), []);
  if (!inStock) {
    return (
      <button type="button" className="add" disabled aria-disabled="true">
        <span>{soldOut}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`add${done ? " done" : ""}`}
      onClick={() => {
        add(slug, 1);
        setDone(true);
        if (t.current) clearTimeout(t.current);
        t.current = setTimeout(() => setDone(false), 1400);
      }}
    >
      <svg width="18" height="18" aria-hidden="true"><use href="#beeico" /></svg>
      <span>{done ? addedLabel : label}</span>
    </button>
  );
}
