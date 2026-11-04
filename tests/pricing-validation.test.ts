import { test } from "node:test";
import assert from "node:assert/strict";
import { shippingFor, subtotalOf, formatGBP, amountToFreeShipping } from "../src/lib/money.ts";
import { checkoutBody, contactBody, registerBody, newsletterBody, productInput, adminLoginBody, trackingNumber } from "../src/lib/validation.ts";

const RULES = { shippingPence: 399, freeThresholdPence: 4000 };

test("shipping: paid below threshold, free at and above it", () => {
  assert.equal(shippingFor(3999, RULES), 399);
  assert.equal(shippingFor(4000, RULES), 0);
  assert.equal(shippingFor(8800, RULES), 0);
  assert.equal(shippingFor(0, RULES), 0);
  assert.equal(amountToFreeShipping(2800, RULES), 1200);
  assert.equal(amountToFreeShipping(9000, RULES), 0);
});

test("subtotal is integer maths and rejects bad lines", () => {
  assert.equal(subtotalOf([{ unitPence: 2800, qty: 1 }, { unitPence: 1600, qty: 2 }]), 6000);
  assert.throws(() => subtotalOf([{ unitPence: 10.5, qty: 1 }]));
  assert.throws(() => subtotalOf([{ unitPence: 100, qty: 0 }]));
  assert.throws(() => subtotalOf([{ unitPence: -100, qty: 1 }]));
});

test("currency formatting", () => {
  assert.match(formatGBP(2800, "en"), /£28/);
  assert.match(formatGBP(399, "en"), /£3\.99/);
  assert.match(formatGBP(399, "ro"), /3,99/);
});

test("checkout body: client can only send slug + qty, never a price", () => {
  const ok = checkoutBody.safeParse({ items: [{ slug: "wild-honey-candle", qty: 2 }], locale: "ro" });
  assert.equal(ok.success, true);
  const withPrice = checkoutBody.parse({ items: [{ slug: "wild-honey-candle", qty: 2, price: 0.01 }], locale: "en" });
  assert.equal("price" in (withPrice.items[0] as object), false); // stripped
  assert.equal(checkoutBody.safeParse({ items: [], locale: "en" }).success, false);
  assert.equal(checkoutBody.safeParse({ items: [{ slug: "x", qty: 0 }], locale: "en" }).success, false);
  assert.equal(checkoutBody.safeParse({ items: [{ slug: "x", qty: 21 }], locale: "en" }).success, false);
  assert.equal(checkoutBody.safeParse({ items: [{ slug: "../etc/passwd", qty: 1 }], locale: "en" }).success, false);
  assert.equal(checkoutBody.safeParse({ items: [{ slug: "Upper_Case", qty: 1 }], locale: "en" }).success, false);
  assert.equal(checkoutBody.safeParse({ items: [{ slug: "x", qty: 1.5 }], locale: "en" }).success, false);
  assert.equal(checkoutBody.safeParse({ items: [{ slug: "x", qty: 1 }], locale: "fr" }).success, false);
});

test("contact: consent required, honeypot must be empty, short messages rejected", () => {
  const base = { name: "Ana", email: "ANA@Example.com", topic: "order", message: "Hello, where is my order?", consent: true, locale: "en" };
  const ok = contactBody.safeParse(base);
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.email, "ana@example.com");
  assert.equal(contactBody.safeParse({ ...base, consent: false }).success, false);
  assert.equal(contactBody.safeParse({ ...base, website: "http://spam" }).success, false);
  assert.equal(contactBody.safeParse({ ...base, message: "short" }).success, false);
  assert.equal(contactBody.safeParse({ ...base, email: "not-an-email" }).success, false);
  assert.equal(contactBody.safeParse({ ...base, message: "x".repeat(4001) }).success, false);
});

test("register and newsletter need explicit consent", () => {
  const reg = { firstName: "Ana", email: "a@b.co", password: "a-long-password", acceptTerms: true, locale: "en" };
  const r = registerBody.safeParse(reg);
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.marketing, false); // never opted in by default
  assert.equal(registerBody.safeParse({ ...reg, acceptTerms: false }).success, false);
  assert.equal(registerBody.safeParse({ ...reg, password: "short" }).success, false);
  assert.equal(newsletterBody.safeParse({ email: "a@b.co", consent: false, locale: "en" }).success, false);
  assert.equal(newsletterBody.safeParse({ email: "a@b.co", consent: true, locale: "ro" }).success, true);
});

test("admin login requires a 6-digit code; tracking numbers are normalised", () => {
  assert.equal(adminLoginBody.safeParse({ email: "o@b.co", password: "x", code: "12345" }).success, false);
  assert.equal(adminLoginBody.safeParse({ email: "o@b.co", password: "x", code: "123456" }).success, true);
  assert.equal(trackingNumber.parse(" rm482910374gb "), "RM482910374GB");
  assert.equal(trackingNumber.safeParse("short").success, false);
  assert.equal(trackingNumber.safeParse("RM48 <script>").success, false);
});

test("product input rejects absurd prices and keeps slug safe", () => {
  const p = { slug: "new-candle", category: "candles", nameEn: "New", nameRo: "Nou", descEn: "Description", descRo: "Descriere", pricePence: 2500, stock: 5, active: true };
  assert.equal(productInput.safeParse(p).success, true);
  assert.equal(productInput.safeParse({ ...p, pricePence: 1 }).success, false);
  assert.equal(productInput.safeParse({ ...p, pricePence: 2500.5 }).success, false);
  assert.equal(productInput.safeParse({ ...p, stock: -1 }).success, false);
  assert.equal(productInput.safeParse({ ...p, slug: "Bad Slug" }).success, false);
});
