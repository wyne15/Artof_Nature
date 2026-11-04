import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { getDict, isLocale, fmt } from "@/i18n";
import { formatGBP } from "@/lib/money";
import { faqLd, pageMetadata } from "@/lib/seo";
import { getSettings } from "@/server/settings";

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = (await params).lang === "ro" ? "ro" : "en";
  const t = getDict(l);
  return pageMetadata({ lang: l, path: "/faq", title: t.seo.faqTitle, description: t.seo.faqDescription });
}

export default async function Faq({ params }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const t = getDict(lang);
  const s = await getSettings();
  const vars = { free: formatGBP(s.freeThresholdPence, lang), ship: formatGBP(s.shippingPence, lang) };
  const items = t.faq.items.map((i) => ({ q: i.q, a: fmt(i.a, vars) }));
  return (
    <section className="sec">
      <JsonLd data={faqLd(items)} />
      <div className="acct wide2">
        <h1>{t.faq.h1}</h1>
        <p className="sub2">{t.faq.more} <Link href={`/${lang}/contact`}>{t.faq.getInTouch}</Link>.</p>
        <div className="faq">
          {items.map((i) => (
            <details key={i.q}><summary>{i.q}</summary><p>{i.a}</p></details>
          ))}
        </div>
      </div>
    </section>
  );
}
