import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "ro"] as const;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function pickLocale(req: NextRequest): (typeof LOCALES)[number] {
  const saved = req.cookies.get("aon-lang")?.value;
  if (saved === "en" || saved === "ro") return saved;
  const accept = (req.headers.get("accept-language") ?? "").toLowerCase();
  // first language the browser lists wins; anything that isn't Romanian gets English
  const first = accept.split(",")[0]?.trim() ?? "";
  return first.startsWith("ro") ? "ro" : "en";
}

function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    // Scripts: only ours (nonce) and what they load. No inline script can run without the nonce.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline styles are allowed (React/SVG style attributes); script execution stays strict.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* 1. CSRF defence for every state-changing API call (Stripe's webhook is verified by signature instead). */
  if (pathname.startsWith("/api/") && !SAFE_METHODS.has(req.method) && !pathname.startsWith("/api/webhook/")) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    let ok = false;
    try {
      ok = Boolean(origin && host && new URL(origin).host === host);
    } catch {
      ok = false;
    }
    if (!ok) {
      return NextResponse.json({ ok: false, error: "forbidden_origin" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
  }
  if (pathname.startsWith("/api/")) return NextResponse.next();

  /* 2. Language: / and any path without /en or /ro get redirected. */
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const first = pathname.split("/")[1] ?? "";
  const hasLocale = (LOCALES as readonly string[]).includes(first);
  if (!isAdmin && !hasLocale) {
    const url = req.nextUrl.clone();
    url.pathname = `/${pickLocale(req)}${pathname === "/" ? "" : pathname}`;
    const res = NextResponse.redirect(url, 307);
    res.headers.set("Vary", "Accept-Language, Cookie");
    return res;
  }

  /* 3. Per-request nonce + Content-Security-Policy. */
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  if (isAdmin) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}

export const config = {
  // Everything except Next internals and files with an extension (icons, sitemap.xml, robots.txt, images…)
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
