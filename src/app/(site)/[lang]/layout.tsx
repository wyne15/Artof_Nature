import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { CartProvider } from "@/components/cart/CartProvider";
import { JsonLd } from "@/components/JsonLd";
import { ShopNote, SiteFooter, SiteHeader, Topbar } from "@/components/SiteChrome";
import { SvgDefs } from "@/components/SvgDefs";
import { BUSINESS } from "@/config/site";
import { getDict, isLocale } from "@/i18n";
import { shopStatus } from "@/lib/logistics";
import { fonts } from "@/lib/fontset";
import { organizationLd, SITE_URL, websiteLd } from "@/lib/seo";
import { listProducts, localize } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { getSession } from "@/server/session";
import "../../globals.css";

export const viewport: Viewport = { themeColor: "#2F3817", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(isLocale(lang) ? lang : "en");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${BUSINESS.brand} | ${t.seo.title}`, template: `%s | ${BUSINESS.brand}` },
    description: t.seo.description,
    applicationName: BUSINESS.brand,
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const [products, settings, session] = await Promise.all([listProducts(), getSettings(), getSession()]);
  const status = shopStatus(new Date(), settings.schedule, settings.manualPause);

  const cartProducts = products.map((p) => {
    const v = localize(p, lang);
    return { slug: v.slug, name: v.name, pricePence: v.pricePence, stock: v.stock, art: { name: v.name, category: v.category, artKind: v.artKind, artColor: v.artColor, artWax: v.artWax }, colors: v.colors, image: v.imageUrls[0] ?? "", multiQty: v.multiQty, multiPricePence: v.multiPricePence, multi2Qty: v.multi2Qty, multi2PricePence: v.multi2PricePence, multi3Qty: v.multi3Qty, multi3PricePence: v.multi3PricePence };
  });

  return (
    <html lang={t.htmlLang} className={fonts} suppressHydrationWarning>
      <body>
        <SvgDefs />
        <a className="skip-link" href="#main">{t.nav.skip}</a>
        <CartProvider
          lang={lang}
          products={cartProducts}
          shippingPence={settings.shippingPence}
          freeThresholdPence={settings.freeThresholdPence}
          signedIn={Boolean(session)}
          labels={{ cart: t.cart, nav: t.nav }}
        >
          <Topbar t={t} freePence={settings.freeThresholdPence} lang={lang} />
          <SiteHeader lang={lang} t={t} session={session} />
          <ShopNote t={t} status={status} lang={lang} />
          <main id="main">{children}</main>
          <SiteFooter lang={lang} t={t} />
        </CartProvider>
        <JsonLd data={organizationLd()} />
        <JsonLd data={websiteLd(lang)} />
      </body>
    </html>
  );
}
