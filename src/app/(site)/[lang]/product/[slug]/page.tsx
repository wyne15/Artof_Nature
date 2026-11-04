import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox, Gallery } from "@/components/BuyBox";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { Svg } from "@/components/Svg";
import { getDict, isLocale, fmt } from "@/i18n";
import { pouredArt, productArt } from "@/lib/art";
import { formatGBP, normalizeOffers, offersLabel } from "@/lib/money";
import { breadcrumbLd, localePath, pageMetadata, productLd } from "@/lib/seo";
import { getProductBySlug, listProducts, localize } from "@/server/catalog";
import { getSettings } from "@/server/settings";

type P = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, slug } = await params;
  const l = isLocale(lang) ? lang : "en";
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Not found", robots: { index: false } };
  const v = localize(p, l);
  return pageMetadata({ lang: l, path: `/product/${slug}`, title: `${v.name} | ${v.note}`, description: v.desc.slice(0, 200), image: v.imageUrls[0] });
}

export default async function ProductPage({ params }: P) {
  const { lang: raw, slug } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const t = getDict(lang);
  const raw_p = await getProductBySlug(slug);
  if (!raw_p) notFound();
  const p = localize(raw_p, lang);
  const settings = await getSettings();
  const others = (await listProducts()).filter((x) => x.slug !== p.slug).map((x) => localize(x, lang));
  const related = [...others.filter((x) => x.category === p.category), ...others.filter((x) => x.category !== p.category)].slice(0, 3);
  const art = { name: p.name, category: p.category, artKind: p.artKind, artColor: p.artColor, artWax: p.artWax };
  const free = formatGBP(settings.freeThresholdPence, lang);
  const catLabel = t.shop[p.category];
  const offerList = [{ qty: p.multiQty, pricePence: p.multiPricePence }, { qty: p.multi2Qty, pricePence: p.multi2PricePence }, { qty: p.multi3Qty, pricePence: p.multi3PricePence }];
  const hasOffer = normalizeOffers(p.pricePence, offerList).length > 0;
  const offerText = hasOffer ? (lang === "ro" ? "Ofertă: " : "Offer: ") + offersLabel(p.pricePence, offerList, lang) : "";

  return (
    <>
      <JsonLd data={productLd({ name: p.name, description: p.desc, slug: p.slug, pricePence: p.pricePence, inStock: p.inStock, shippingPence: settings.shippingPence, images: p.imageUrls }, lang)} />
      <JsonLd data={breadcrumbLd([{ name: t.nav.home, path: localePath(lang) }, { name: t.shop.h1, path: localePath(lang, "/shop") }, { name: p.name, path: localePath(lang, `/product/${p.slug}`) }])} />
      <section className="sec pdp-page">
        <div className="crumb"><Link href={`/${lang}/shop`}>{t.product.crumbShop}</Link> / <Link href={`/${lang}/shop?c=${p.category}`}>{catLabel}</Link> / {p.name}</div>
        <div className="pdp">
          <Gallery count={p.imageUrls.length > 0 ? p.imageUrls.length : 3}>
            {p.imageUrls.length > 0 ? (
              p.imageUrls.map((u, i) => (
                <div key={u}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={fmt(t.product.photoAlt, { name: p.name, n: String(i + 1) })} width={800} height={1000} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
                </div>
              ))
            ) : (
              <>
                <div><Svg html={productArt(art, 0, "", fmt(t.product.illustration, { name: p.name }))} /></div>
                <div><Svg html={productArt(art, 1, "", fmt(t.product.illustration, { name: p.name }))} /></div>
                <div><Svg html={pouredArt(p.category, t.product.poured)} /></div>
              </>
            )}
          </Gallery>
          <div>
            <h1>{p.name}</h1>
            <div className="pr">{formatGBP(p.pricePence, lang)}</div>
            {offerText && <p style={{ margin: "2px 0 10px", fontWeight: 600, color: "var(--olive)" }}>{offerText}</p>}
            <p className="ds">{p.desc}</p>
            <ul className="facts">
              {p.format && <li><span>{t.product.format}</span><span>{p.format}</span></li>}
              <li><span>{t.product.wax}</span><span>{t.product.waxValue}</span></li>
              <li><span>{t.product.made}</span><span>{t.product.madeValue}</span></li>
              <li><span>{t.product.delivery}</span><span>{fmt(t.product.deliveryValue, { free })}</span></li>
            </ul>
            {p.inStock && p.stock <= 3 && <p className="lowstock">{fmt(t.product.lowStock, { n: p.stock })}</p>}
            <BuyBox slug={p.slug} stock={p.stock} priceText={formatGBP(p.pricePence, lang)} colors={p.colors} labels={{ addToBag: t.product.addToBag, outOfStock: t.product.outOfStock, qty: t.product.qty, dec: t.product.dec, inc: t.product.inc, colour: t.product.colour, chooseColour: t.product.chooseColour }} />
          </div>
        </div>
      </section>
      <section className="sec" style={{ paddingTop: 8 }}>
        <div className="sec-head"><h2>{t.product.alsoLike}</h2></div>
        <div className="grid three">{related.map((x) => <ProductCard key={x.slug} p={x} lang={lang} t={t} />)}</div>
      </section>
    </>
  );
}
