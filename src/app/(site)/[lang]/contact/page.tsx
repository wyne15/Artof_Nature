import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { BUSINESS } from "@/config/site";
import { getDict, isLocale } from "@/i18n";
import { pageMetadata } from "@/lib/seo";

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = (await params).lang === "ro" ? "ro" : "en";
  const t = getDict(l);
  return pageMetadata({ lang: l, path: "/contact", title: t.seo.contactTitle, description: t.seo.contactDescription });
}

export default async function Contact({ params }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const t = getDict(lang);
  const c = t.contact;
  return (
    <section className="sec">
      <div className="ct">
        <div>
          <h1>{c.h1}</h1>
          <p className="sub2">{c.sub}</p>
          <ul className="cinfo">
            <li><b>{c.email}</b><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></li>
            <li><b>{c.orders}</b><span>{c.ordersText}</span></li>
            <li><b>{c.madeIn}</b><span>{c.madeInValue}</span></li>
          </ul>
          <p className="alt2">{c.looking} <Link href={`/${lang}/faq`}>{c.faqLink}</Link>.</p>
        </div>
        <ContactForm lang={lang} t={c} />
      </div>
    </section>
  );
}
