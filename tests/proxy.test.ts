import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy.ts";

const req = (url: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  new NextRequest(`https://shop.example${url}`, { method: init.method ?? "GET", headers: { host: "shop.example", ...(init.headers ?? {}) } });

test("home redirects to the visitor's language (Romanian browsers → /ro, everyone else → /en)", () => {
  const ro = proxy(req("/", { headers: { "accept-language": "ro-RO,ro;q=0.9,en;q=0.8" } }));
  assert.equal(ro.status, 307);
  assert.match(ro.headers.get("location")!, /\/ro$/);
  const none = proxy(req("/"));
  assert.match(none.headers.get("location")!, /\/en$/);
  const saved = proxy(req("/shop", { headers: { cookie: "aon-lang=ro", "accept-language": "en-GB" } }));
  assert.match(saved.headers.get("location")!, /\/ro\/shop$/);
});

test("pages get a per-request nonce CSP with no inline-script escape hatch", () => {
  const a = proxy(req("/en"));
  const b = proxy(req("/en"));
  const cspA = a.headers.get("content-security-policy")!;
  const cspB = b.headers.get("content-security-policy")!;
  assert.notEqual(cspA, cspB, "nonce changes on every request");
  const scriptSrc = cspA.split(";").find((d) => d.trim().startsWith("script-src"))!;
  assert.match(scriptSrc, /'nonce-[A-Za-z0-9+/=]+'/);
  assert.match(scriptSrc, /'strict-dynamic'/);
  assert.doesNotMatch(scriptSrc, /unsafe-inline|unsafe-eval/);
  assert.match(cspA, /frame-ancestors 'none'/);
  assert.match(cspA, /object-src 'none'/);
  assert.match(cspA, /base-uri 'self'/);
});

test("admin pages are never cached or indexed", () => {
  const r = proxy(req("/admin/orders"));
  assert.equal(r.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  assert.equal(r.headers.get("cache-control"), "no-store");
});

test("state-changing API calls from another site are rejected (CSRF)", async () => {
  const evil = proxy(req("/api/contact", { method: "POST", headers: { origin: "https://evil.example" } }));
  assert.equal(evil.status, 403);
  const none = proxy(req("/api/contact", { method: "POST" }));
  assert.equal(none.status, 403);
  const ok = proxy(req("/api/contact", { method: "POST", headers: { origin: "https://shop.example" } }));
  assert.notEqual(ok.status, 403);
});

test("Stripe's webhook is exempt from the origin check (it is verified by signature instead)", () => {
  const r = proxy(req("/api/webhook/stripe", { method: "POST" }));
  assert.notEqual(r.status, 403);
});

test("read-only API calls are allowed", () => {
  assert.notEqual(proxy(req("/api/shop-status")).status, 403);
});
