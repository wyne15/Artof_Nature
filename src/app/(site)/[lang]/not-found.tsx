"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MINI } from "@/i18n/mini";

export default function NotFound() {
  const lang = (usePathname() ?? "").startsWith("/ro") ? "ro" : "en";
  const t = MINI[lang].notFound;
  return (
    <section className="sec nf">
      <div className="nf-in">
        <div className="nf-bee" aria-hidden="true"><svg width="120" height="120"><use href="#beeico" /></svg></div>
        <h1>{t.h1}</h1>
        <p>{t.p}</p>
        <div className="hero-cta" style={{ justifyContent: "center" }}>
          <Link className="btn btn-olive" href={`/${lang}/shop`}>{t.shop}</Link>
          <Link className="btn btn-line" href={`/${lang}`}>{t.home}</Link>
        </div>
      </div>
    </section>
  );
}
