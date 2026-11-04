import { isAdmin } from "@/server/adminAuth";
import { db } from "@/server/db";
import { allow, audit, bad, json } from "@/server/http";
import { cleanImage, MAX_UPLOAD_BYTES, randomImageName } from "@/lib/imageClean";

export const dynamic = "force-dynamic";

/**
 * Product photo upload. Admin only (signed cookie), same-origin only (proxy CSRF check), rate limited.
 * The file type is decided from the bytes, metadata (GPS etc.) is stripped, the name is random.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return bad("unauthorized", 401);
  if (!(await allow("adm:upload", 60, 600))) return bad("rate_limited", 429);

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return bad("too_large", 413);

  let file: File | null = null;
  try {
    const fd = await req.formData();
    const f = fd.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return bad("invalid_request", 400);
  }
  if (!file) return bad("no_file", 400);
  if (file.size > MAX_UPLOAD_BYTES) return bad("too_large", 413);

  const clean = cleanImage(new Uint8Array(await file.arrayBuffer()));
  if (!clean) return bad("unsupported_image", 415);

  const name = randomImageName(clean.ext);
  const { error } = await db().storage.from("product-images").upload(name, clean.bytes, {
    contentType: clean.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("upload", error.message);
    return bad("storage_error", 502);
  }
  await audit("admin", "image_upload", { file: name });
  return json({ ok: true, path: name });
}
