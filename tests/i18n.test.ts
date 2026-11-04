import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/i18n/en.ts";
import { ro } from "../src/i18n/ro.ts";
import { fmt } from "../src/i18n/fmt.ts";

function walk(a: unknown, b: unknown, path: string, out: string[]) {
  if (typeof a === "string") {
    if (typeof b !== "string") return void out.push(`${path}: type differs`);
    if (a.trim() === "" || b.trim() === "") out.push(`${path}: empty`);
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    if (ph(a) !== ph(b)) out.push(`${path}: placeholders differ (${ph(a)} vs ${ph(b)})`);
  } else if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return void out.push(`${path}: array length differs`);
    a.forEach((x, i) => walk(x, b[i], `${path}[${i}]`, out));
  } else if (a && typeof a === "object") {
    if (!b || typeof b !== "object") return void out.push(`${path}: missing`);
    const ka = Object.keys(a).sort().join("|");
    const kb = Object.keys(b).sort().join("|");
    if (ka !== kb) out.push(`${path}: keys differ (${ka} vs ${kb})`);
    for (const k of Object.keys(a)) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, out);
  }
}

test("English and Romanian dictionaries have identical structure, placeholders and no empty text", () => {
  const problems: string[] = [];
  walk(en, ro, "dict", problems);
  assert.deepEqual(problems, []);
});

test("Romanian is actually translated (not copied English) for key marketing text", () => {
  for (const k of ["h1", "sub", "cta"] as const) assert.notEqual(en.hero[k], ro.hero[k]);
  assert.notEqual(en.legal.privacy.intro, ro.legal.privacy.intro);
  assert.match(ro.hero.h1, /Moldova/);
  assert.match(en.hero.h1, /Moldovan/);
});

test("the site never claims British wax", () => {
  const all = JSON.stringify(en) + JSON.stringify(ro);
  assert.doesNotMatch(all, /British (bees|beeswax|wax)/i);
});

test("delivery promises match the real workflow (2 to 4 working days, UK only, customer pays return)", () => {
  assert.match(en.legal.delivery.sections[2]!.p[0]!, /2 to 4 working days/);
  assert.match(en.legal.delivery.sections[0]!.p[0]!, /United Kingdom only/);
  assert.match(en.legal.returns.sections[0]!.p[1]!, /You pay the cost of returning/);
  assert.match(ro.legal.returns.sections[0]!.p[1]!, /Costul returului îl suporți tu/);
});

test("fmt fills placeholders and leaves unknown ones alone", () => {
  assert.equal(fmt("Hi {name}, {x}", { name: "Ana" }), "Hi Ana, {x}");
});
