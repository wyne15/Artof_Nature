import { randomBytes } from "node:crypto";

/**
 * Photo upload safety, without any native image library:
 *  - the type is decided by the file's first bytes, never by its name or the browser's claim;
 *  - JPEG: all metadata segments (EXIF incl. GPS location, XMP, IPTC, comments) are removed;
 *  - PNG: text and EXIF chunks are removed;
 *  - the stored name is random, so nothing the uploader typed ends up in a URL.
 */
export type CleanImage = { bytes: Uint8Array; ext: "jpg" | "png"; contentType: "image/jpeg" | "image/png" };

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function sniff(b: Uint8Array): "jpg" | "png" | null {
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && PNG_SIG.every((v, i) => b[i] === v)) return "png";
  return null;
}

function stripJpeg(b: Uint8Array): Uint8Array | null {
  const out: number[][] = [[0xff, 0xd8]];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) return null; // malformed
    while (b[i] === 0xff) i++; // fill bytes
    const marker = b[i]!;
    i++;
    if (marker === 0xd9) { out.push([0xff, 0xd9]); break; } // EOI
    if (marker === 0xda) {
      // Start of scan: the rest is compressed image data up to the end of file. Keep it as is.
      out.push([0xff, 0xda], Array.from(b.subarray(i)));
      i = b.length;
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { out.push([0xff, marker]); continue; } // no length
    if (i + 2 > b.length) return null;
    const len = (b[i]! << 8) | b[i + 1]!;
    if (len < 2 || i + len > b.length) return null;
    const seg = b.subarray(i - 2, i + len);
    // Drop APP1..APP15 (EXIF/XMP/etc) and COM. Keep APP0 (JFIF) and APP14 (Adobe colour transform).
    const isMeta = (marker >= 0xe1 && marker <= 0xef && marker !== 0xee) || marker === 0xfe;
    if (!isMeta) out.push(Array.from(seg));
    i += len;
  }
  let total = 0;
  for (const c of out) total += c.length;
  const res = new Uint8Array(total);
  let o = 0;
  for (const c of out) { res.set(c, o); o += c.length; }
  return res;
}

const DROP_PNG = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

function stripPng(b: Uint8Array): Uint8Array | null {
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  let sawEnd = false;
  while (i + 12 <= b.length) {
    const len = ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0;
    const type = String.fromCharCode(b[i + 4]!, b[i + 5]!, b[i + 6]!, b[i + 7]!);
    const end = i + 12 + len;
    if (end > b.length) return null;
    if (!DROP_PNG.has(type)) parts.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") { sawEnd = true; break; }
  }
  if (!sawEnd) return null;
  let total = 0;
  for (const p of parts) total += p.length;
  const res = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { res.set(p, o); o += p.length; }
  return res;
}

/** Returns the cleaned image, or null if the bytes are not a valid JPEG or PNG. */
export function cleanImage(input: Uint8Array): CleanImage | null {
  if (input.length === 0 || input.length > MAX_UPLOAD_BYTES) return null;
  const kind = sniff(input);
  if (kind === "jpg") {
    const bytes = stripJpeg(input);
    return bytes && bytes.length > 4 ? { bytes, ext: "jpg", contentType: "image/jpeg" } : null;
  }
  if (kind === "png") {
    const bytes = stripPng(input);
    return bytes ? { bytes, ext: "png", contentType: "image/png" } : null;
  }
  return null;
}

export function randomImageName(ext: "jpg" | "png"): string {
  return `${randomBytes(16).toString("hex")}.${ext}`;
}
