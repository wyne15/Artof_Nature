import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getDict, isLocale, fmt } from "@/i18n";
import { formatGBP } from "@/lib/money";
import { breadcrumbLd, localePath, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { listProducts, localize } from "@/server/catalog";
import { getSettings } from "@/server/settings";

type P = { params: Promise<{ lang: string }>; searchParams: Promise<{ c?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params;
  const l = isLocale(lang) ? lang : "en";
  const t = getDict(l);
  const s = await getSettings();
  return pageMetadata({ lang: l, path: "/shop", title: t.seo.shopTitle, description: fmt(t.seo.shopDescription, { free: formatGBP(s.freeThresholdPence, l) }) });
}

const CATS = ["all", "candles", "skincare", "gifts"] as const;

export default async function Shop({ params, searchParams }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const { c } = await searchParams;
  const cat = (CATS as readonly string[]).includes(c ?? "") ? (c as (typeof CATS)[number]) : "all";
  const t = getDict(lang);
  const list = (await listProducts()).map((p) => localize(p, lang)).filter((p) => cat === "all" || p.category === cat);

  return (
    <section className="sec">
      <JsonLd data={breadcrumbLd([{ name: t.nav.home, path: localePath(lang) }, { name: t.shop.h1, path: localePath(lang, "/shop") }])} />
      <div className="sec-head">
        <div><h1 style={{ fontSize: "clamp(36px,5vw,56px)" }}>{t.shop.h1}</h1><p>{t.shop.sub}</p></div>
      </div>
      <div className="chips" role="group" aria-label={t.shop.filter}>
        {CATS.map((k) => (
          <Link key={k} className="chip" href={k === "all" ? `/${lang}/shop` : `/${lang}/shop?c=${k}`} aria-current={k === cat ? "page" : undefined} scroll={false}>{t.shop[k]}</Link>
        ))}
      </div>
      {list.length === 0 ? <p>{t.shop.empty}</p> : <div className="grid">{list.map((p) => <ProductCard key={p.slug} p={p} lang={lang} t={t} />)}</div>}
    </section>
  );
}
