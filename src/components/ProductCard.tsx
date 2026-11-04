import Link from "next/link";
import type { Dict } from "@/i18n";
import { productArt } from "@/lib/art";
import { formatGBP, offersLabel, type Locale } from "@/lib/money";
import type { ProductView } from "@/server/catalog";
import { AddButton } from "./AddButton";
import { Svg } from "./Svg";

export function ProductCard({ p, lang, t }: { p: ProductView; lang: Locale; t: Dict }) {
  const href = `/${lang}/product/${p.slug}`;
  const art = { name: p.name, category: p.category, artKind: p.artKind, artColor: p.artColor, artWax: p.artWax };
  const offerText = p.inStock
    ? offersLabel(
        p.pricePence,
        [
          { qty: p.multiQty, pricePence: p.multiPricePence },
          { qty: p.multi2Qty, pricePence: p.multi2PricePence },
          { qty: p.multi3Qty, pricePence: p.multi3PricePence },
        ],
        lang,
      )
    : "";
  return (
    <article className="card">
      <Link className="ph" href={href} aria-label={p.name}>
        {p.tag && <span className="tag">{t.tags[p.tag]}</span>}
        {!p.inStock && <span className="soldout">{t.product.outOfStock}</span>}
        {offerText && <span className="offer-tag">{offerText}</span>}
        {p.imageUrls.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="a" src={p.imageUrls[0]} alt="" width={400} height={500} loading="lazy" decoding="async" />
            {p.imageUrls.length > 1 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="b" src={p.imageUrls[1]} alt="" width={400} height={500} loading="lazy" decoding="async" />
            )}
          </>
        ) : (
          <>
            <Svg html={productArt(art, 0, "a")} />
            <Svg html={productArt(art, 1, "b")} />
          </>
        )}
      </Link>
      <h3><Link href={href}>{p.name}</Link></h3>
      <p className="note">{p.note}</p>
      <div className="row">
        <span className="price">{formatGBP(p.pricePence, lang)}</span>
        {p.colors.length > 0 && p.inStock ? (
          <Link className="add" href={href}>
            <span>{t.product.chooseOptions}</span>
          </Link>
        ) : (
          <AddButton slug={p.slug} inStock={p.inStock} label={t.product.addToBag} addedLabel={t.product.added} soldOut={t.product.outOfStock} />
        )}
      </div>
    </article>
  );
}

export function Hexdiv() {
  return (
    <div className="hexdiv" aria-hidden="true">
      <svg><rect width="100%" height="100%" fill="url(#hp)" /></svg>
      <div className="bdg"><svg width="30" height="30"><use href="#beeico" /></svg></div>
    </div>
  );
}
