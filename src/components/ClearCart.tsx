"use client";

import { useEffect } from "react";
import { useCart } from "./cart/CartProvider";

/** After a successful payment the bag is emptied. */
export function ClearCart() {
  const { clear } = useCart();
  useEffect(() => clear(), [clear]);
  return null;
}
