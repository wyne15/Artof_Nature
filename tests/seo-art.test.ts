import { test } from "node:test";
import assert from "node:assert/strict";
import { jsonLdString, productLd, pageMetadata, faqLd } from "../src/lib/seo.ts";
import { productArt, heroArt } from "../src/lib/art.ts";

test("JSON-LD can never close its script tag", () => {
  const s = jsonLdString({ name: "</script><script>alert(1)</script>" });
  assert.ok(!s.includes("</script>"));
  assert.ok(!s.includes("<"));
  assert.equal(JSON.parse(s).name, "</script><script>alert(1)</script>");
});

test("product structured data has price, availability, shipping and return policy", () => {
  const ld = productLd({ name: "Wild Honey Candle", description: "d", slug: "wild-honey-candle", pricePence: 2800, inStock: true, shippingPence: 399 }, "en") as Record<string, any>;
  assert.equal(ld.offers.price, "28.00");
  assert.equal(ld.offers.priceCurrency, "GBP");
  assert.match(ld.offers.availability, /InStock/);
  assert.equal(ld.offers.shippingDetails.shippingRate.value, "3.99");
  assert.equal(ld.offers.hasMerchantReturnPolicy.merchantReturnDays, 14);
  assert.equal(ld.aggregateRating, undefined, "no invented ratings");
  assert.equal(ld.review, undefined, "no invented reviews");
});

test("sold-out product is marked OutOfStock", () => {
  const ld = productLd({ name: "x", description: "d", slug: "x", pricePence: 100, inStock: false, shippingPence: 0 }, "ro") as Record<string, any>;
  assert.match(ld.offers.availability, /OutOfStock/);
});

test("pages declare canonical + hreflang for both languages + x-default", () => {
  const m = pageMetadata({ lang: "ro", path: "/shop", title: "t", description: "d" });
  const alt = m.alternates!;
  assert.match(String(alt.canonical), /\/ro\/shop$/);
  const langs = alt.languages as Record<string, string>;
  assert.match(langs.en!, /\/en\/shop$/);
  assert.match(langs.ro!, /\/ro\/shop$/);
  assert.match(langs["x-default"]!, /\/en\/shop$/);
});

test("noindex pages say so", () => {
  const m = pageMetadata({ lang: "en", path: "/account", title: "t", description: "d", noindex: true });
  assert.deepEqual(m.robots, { index: false, follow: false });
});

test("FAQ structured data mirrors the visible questions", () => {
  const ld = faqLd([{ q: "Q?", a: "A." }]) as Record<string, any>;
  assert.equal(ld.mainEntity[0].name, "Q?");
  assert.equal(ld.mainEntity[0].acceptedAnswer.text, "A.");
});

test("illustrations escape names and reject non-hex colours", () => {
  const svg = productArt({ name: '"><script>x</script>', category: "candles", artKind: "candle", artColor: "red;}</style>", artWax: "#EBCB7D" }, 0, "a", '"><script>x</script>');
  assert.ok(!svg.includes("<script>"));
  assert.ok(!svg.includes("red;}"));
  assert.match(svg, /#C9993A/);
  assert.ok(heroArt("a & b").includes("a &amp; b"));
});
