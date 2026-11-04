import type { Metadata } from "next";
import { BUSINESS } from "@/config/site";
import type { Locale } from "./money";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const abs = (path: string) => `${SITE_URL}${path}`;
export const localePath = (lang: Locale, path = "") => `/${lang}${path === "/" ? "" : path}`;

type Args = {
  lang: Locale;
  /** path without the language prefix, e.g. "/shop" or "" for home */
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
  image?: string;
  type?: "website" | "article";
};

/** Canonical + hreflang alternates, Open Graph and Twitter cards for one page. */
export function pageMetadata({ lang, path, title, description, noindex, image, type = "website" }: Args): Metadata {
  const url = abs(localePath(lang, path));
  const img = image ?? abs("/og.jpg");
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { en: abs(localePath("en", path)), ro: abs(localePath("ro", path)), "x-default": abs(localePath("en", path)) },
    },
    openGraph: {
      type,
      url,
      siteName: BUSINESS.brand,
      title,
      description,
      locale: lang === "ro" ? "ro_RO" : "en_GB",
      alternateLocale: lang === "ro" ? ["en_GB"] : ["ro_RO"],
      images: image ? [{ url: img, alt: title }] : [{ url: img, width: 1200, height: 1200, alt: BUSINESS.brand }],
    },
    twitter: { card: "summary_large_image", title, description, images: [img] },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  };
}

/* ───────────── JSON-LD (structured data) ───────────── */
/** JSON for a <script type="application/ld+json">. "<" is escaped so the data can never close the script tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": abs("/#organization"),
    name: BUSINESS.brand,
    url: abs("/"),
    logo: abs("/logo.png"),
    email: BUSINESS.email,
    areaServed: "GB",
    description: "Handmade beeswax candles and natural skincare, poured by hand in small batches in England.",
  };
}

export function websiteLd(lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": abs("/#website"),
    url: abs(localePath(lang)),
    name: BUSINESS.brand,
    inLanguage: lang === "ro" ? "ro-RO" : "en-GB",
    publisher: { "@id": abs("/#organization") },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}

export function productLd(p: { name: string; description: string; slug: string; pricePence: number; inStock: boolean; shippingPence: number; images?: string[] }, lang: Locale) {
  const url = abs(localePath(lang, `/product/${p.slug}`));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.slug,
    image: p.images && p.images.length > 0 ? p.images : [abs("/og.jpg")],
    brand: { "@type": "Brand", name: BUSINESS.brand },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "GBP",
      price: (p.pricePence / 100).toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": abs("/#organization") },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: (p.shippingPence / 100).toFixed(2), currency: "GBP" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 4, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "GB",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnShippingFees",
      },
    },
  };
}
