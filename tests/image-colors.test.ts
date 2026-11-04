import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanImage, sniff, MAX_UPLOAD_BYTES } from "../src/lib/imageClean.ts";
import { cleanColors, cleanImages, imageUrl, isImagePath } from "../src/lib/variants.ts";
import { checkoutBody, productInput } from "../src/lib/validation.ts";

const seg = (marker: number, payload: number[]) => [0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 0xff, ...payload];
const ascii = (s: string) => Array.from(Buffer.from(s, "latin1"));

test("JPEG: EXIF/XMP/comment segments are removed, image data is kept", () => {
  const jpeg = new Uint8Array([
    0xff, 0xd8,
    ...seg(0xe0, ascii("JFIF\0")),
    ...seg(0xe1, ascii("Exif\0\0GPSLatitude=52.2405")),
    ...seg(0xe1, ascii("http://ns.adobe.com/xap/1.0/\0")),
    ...seg(0xfe, ascii("secret comment")),
    ...seg(0xdb, [0, 1, 2, 3]),
    ...seg(0xda, [1, 1, 0, 0, 63, 0]),
    1, 2, 3, 4, 5, 6, 0xff, 0xd9,
  ]);
  const out = cleanImage(jpeg);
  assert.ok(out);
  assert.equal(out.ext, "jpg");
  const text = Buffer.from(out.bytes).toString("latin1");
  assert.ok(!text.includes("Exif") && !text.includes("GPS") && !text.includes("secret") && !text.includes("adobe"));
  assert.ok(text.includes("JFIF"));
  assert.deepEqual(Array.from(out.bytes.slice(-8)), [1, 2, 3, 4, 5, 6, 0xff, 0xd9]);
});

const chunk = (type: string, data: number[]) => [(data.length >>> 24) & 255, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255, ...ascii(type), ...data, 0, 0, 0, 0];

test("PNG: text and EXIF chunks are removed, the rest is kept", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunk("IHDR", new Array(13).fill(1)), ...chunk("tEXt", ascii("Author\0Someone")), ...chunk("eXIf", ascii("GPS")), ...chunk("IDAT", [9, 9, 9]), ...chunk("IEND", [])]);
  const out = cleanImage(png);
  assert.ok(out);
  assert.equal(out.ext, "png");
  const text = Buffer.from(out.bytes).toString("latin1");
  assert.ok(!text.includes("Someone") && !text.includes("eXIf") && !text.includes("tEXt"));
  assert.ok(text.includes("IHDR") && text.includes("IDAT") && text.includes("IEND"));
});

test("uploads: other types, disguised files, truncated and oversized files are rejected", () => {
  assert.equal(cleanImage(new Uint8Array(Buffer.from("<svg onload=alert(1)></svg>"))), null);
  assert.equal(cleanImage(new Uint8Array(Buffer.from("GIF89a....."))), null);
  assert.equal(cleanImage(new Uint8Array(Buffer.from("RIFF....WEBPVP8 "))), null);
  assert.equal(cleanImage(new Uint8Array(Buffer.from("<?php system($_GET[1]);"))), null);
  assert.equal(cleanImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2])), null); // length runs past the end
  assert.equal(cleanImage(new Uint8Array(0)), null);
  assert.equal(cleanImage(new Uint8Array(MAX_UPLOAD_BYTES + 1).fill(0xff)), null);
  assert.equal(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0])), "jpg");
});

test("image paths are random hex only; URLs are built from the bucket", () => {
  const ok = "0123456789abcdef0123456789abcdef.jpg";
  assert.equal(isImagePath(ok), true);
  for (const bad of ["../x.jpg", "a.jpg", ok + "/../../x", "0123456789abcdef0123456789abcdef.svg", "0123456789ABCDEF0123456789ABCDEF.jpg", ""]) assert.equal(isImagePath(bad), false, bad);
  assert.equal(imageUrl("https://abc.supabase.co/", ok), `https://abc.supabase.co/storage/v1/object/public/product-images/${ok}`);
  assert.equal(imageUrl("https://abc.supabase.co", "../../etc/passwd"), "");
  assert.deepEqual(cleanImages([ok, "bad", 5, null]), [ok]);
});

test("colours: junk, duplicates and bad hex are dropped when reading from the database", () => {
  const out = cleanColors([
    { id: "c1", nameEn: "Honey", nameRo: "Miere", hex: "#C9993A" },
    { id: "c1", nameEn: "Dup", nameRo: "Dup", hex: "#000000" },
    { id: "c2", nameEn: "Bad", nameRo: "Rău", hex: "red" },
    { id: "C3", nameEn: "Upper", nameRo: "Mare", hex: "#112233" },
    { id: "c4", nameEn: " ", nameRo: "x", hex: "#112233" },
    "nope", null,
  ]);
  assert.deepEqual(out, [{ id: "c1", nameEn: "Honey", nameRo: "Miere", hex: "#C9993A" }]);
});

const base = { slug: "x-candle", category: "candles", nameEn: "Candle", nameRo: "Lumânare", descEn: "Hello there", descRo: "Salut acolo", pricePence: 2000, stock: 3, active: true };

test("product form: colours validated, ids unique, photo names strict", () => {
  const good = productInput.safeParse({ ...base, images: ["0123456789abcdef0123456789abcdef.png"], colors: [{ id: "c1", nameEn: "Honey", nameRo: "Miere", hex: "#C9993A" }, { id: "c2", nameEn: "Lavender", nameRo: "Lavandă", hex: "#9A88B0" }] });
  assert.equal(good.success, true);
  assert.equal(productInput.safeParse(base).success, true); // both optional
  assert.equal(productInput.safeParse({ ...base, colors: [{ id: "c1", nameEn: "A", nameRo: "A", hex: "#C9993A" }, { id: "c1", nameEn: "B", nameRo: "B", hex: "#9A88B0" }] }).success, false);
  assert.equal(productInput.safeParse({ ...base, colors: [{ id: "c1", nameEn: "A", nameRo: "A", hex: "javascript:alert(1)" }] }).success, false);
  assert.equal(productInput.safeParse({ ...base, images: ["https://evil.example/x.jpg"] }).success, false);
  assert.equal(productInput.safeParse({ ...base, colors: Array.from({ length: 13 }, (_, i) => ({ id: `c${i}`, nameEn: "A", nameRo: "A", hex: "#C9993A" })) }).success, false);
});

test("checkout: colour is an optional short id, nothing else", () => {
  assert.equal(checkoutBody.safeParse({ items: [{ slug: "x", qty: 1, color: "c1" }], locale: "en" }).success, true);
  assert.equal(checkoutBody.safeParse({ items: [{ slug: "x", qty: 1 }], locale: "en" }).success, true);
  assert.equal(checkoutBody.safeParse({ items: [{ slug: "x", qty: 1, color: "<script>" }], locale: "en" }).success, false);
  assert.equal(checkoutBody.safeParse({ items: [{ slug: "x", qty: 1, color: "a".repeat(25) }], locale: "en" }).success, false);
});
