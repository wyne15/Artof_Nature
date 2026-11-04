import type { Metadata } from "next";
import Link from "next/link";
import { ClearCart } from "@/components/ClearCart";
import { getDict, isLocale } from "@/i18n";
import { pageMetadata } from "@/lib/seo";

type P = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = (await params).lang === "ro" ? "ro" : "en";
  return pageMetadata({ lang: l, path: "/checkout/success", title: getDict(l).success.h1, description: getDict(l).success.p1, noindex: true });
}

export default async function Success({ params }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const s = getDict(lang).success;
  return (
    <section className="sec nf">
      <ClearCart />
      <div className="nf-in">
        <div className="nf-bee" aria-hidden="true">
          <svg width="86" height="86" viewBox="0 0 86 86" fill="none" stroke="#5C6B2E" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"><polygon points="43,5 76,24 76,62 43,81 10,62 10,24" /><path d="M28 44l10 10 20-22" /></svg>
        </div>
        <h1>{s.h1}</h1>
        <p>{s.p1}</p>
        <p>{s.p2}</p>
        <div className="hero-cta" style={{ justifyContent: "center" }}><Link className="btn btn-olive" href={`/${lang}/shop`}>{s.cta}</Link></div>
      </div>
    </section>
  );
}
