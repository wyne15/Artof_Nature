import Link from "next/link";
import { BUSINESS } from "@/config/site";
import type { Dict } from "@/i18n";
import { fmt } from "@/i18n/fmt";
import { formatDate, type ShopStatus } from "@/lib/logistics";
import { formatGBP, type Locale } from "@/lib/money";
import type { Session } from "@/server/session";
import { HeaderShell } from "./HeaderParts";

export function Topbar({ t, freePence, lang }: { t: Dict; freePence: number; lang: Locale }) {
  return <div className="topbar">{fmt(t.topbar, { free: formatGBP(freePence, lang) })}</div>;
}

export function ShopNote({ t, status, lang }: { t: Dict; status: ShopStatus; lang: Locale }) {
  if (status.state === "open") return null;
  const date = formatDate(status.resumeOn, lang);
  const extra = lang === "ro" ? status.noteRo : status.noteEn;
  const base = fmt(status.state === "paused" ? t.banner.paused : t.banner.away, { date });
  return (
    <div className={`shopnote${status.state === "paused" ? " paused" : ""}`} role="status">
      {base}
      {extra ? ` ${extra}` : ""}
    </div>
  );
}

export function SiteHeader({ lang, t, session }: { lang: Locale; t: Dict; session: Session | null }) {
  const items = [
    { href: `/${lang}/shop`, label: t.nav.shop },
    { href: `/${lang}/story`, label: t.nav.story },
    { href: `/${lang}/faq`, label: t.nav.faq },
    { href: `/${lang}/contact`, label: t.nav.contact },
  ];
  const account = (
    <Link className="cartbtn" id="acBtn" href={`/${lang}/account`} aria-label={session ? t.nav.account : t.nav.signIn}>
      {session ? (
        <span className="ini">{(session.firstName || session.email).charAt(0).toUpperCase()}</span>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>
      )}
    </Link>
  );
  return (
    <HeaderShell
      lang={lang}
      homeHref={`/${lang}`}
      homeLabel={t.nav.home}
      brand={BUSINESS.brand}
      navLabel={t.nav.main}
      items={items}
      accountItem={{ href: `/${lang}/account`, label: t.nav.account }}
      switchLabel={t.switchTo.label}
      switchFull={t.switchTo.full}
      account={account}
    />
  );
}

const isSet = (v: string) => v !== "" && !v.startsWith("TODO");

export function SiteFooter({ lang, t }: { lang: Locale; t: Dict }) {
  const f = t.footer;
  const biz = [isSet(BUSINESS.legalName) && `${f.legalName} ${BUSINESS.legalName}`, isSet(BUSINESS.address) && BUSINESS.address, isSet(BUSINESS.icoNumber) && `${f.registered}: ${BUSINESS.icoNumber}`, BUSINESS.vatNumber && `VAT ${BUSINESS.vatNumber}`].filter(Boolean);
  return (
    <footer className="ftr">
      <div className="ftr-in">
        <div className="ftr-brand">
          <svg width="34" height="34" aria-hidden="true"><use href="#beeico" /></svg>
          <p>{f.blurb}</p>
        </div>
        <div>
          <h3>{f.shop}</h3>
          <Link href={`/${lang}/shop`}>{f.allProducts}</Link>
          <Link href={`/${lang}/shop?c=candles`}>{t.shop.candles}</Link>
          <Link href={`/${lang}/shop?c=skincare`}>{t.shop.skincare}</Link>
          <Link href={`/${lang}/shop?c=gifts`}>{t.shop.gifts}</Link>
        </div>
        <div>
          <h3>{f.help}</h3>
          <Link href={`/${lang}/delivery`}>{f.delivery}</Link>
          <Link href={`/${lang}/returns`}>{f.returns}</Link>
          <Link href={`/${lang}/faq`}>{f.faq}</Link>
          <Link href={`/${lang}/contact`}>{f.contact}</Link>
          <Link href={`/${lang}/account`}>{f.account}</Link>
        </div>
      </div>
      {biz.length > 0 && <p className="ftr-biz">{biz.join(" · ")}</p>}
      <div className="ftr-bot">
        <span>© {new Date().getFullYear()} {BUSINESS.brand}. {f.rights}</span>
        <span className="legal-l">
          <Link href={`/${lang}/privacy`}>{f.privacy}</Link>
          <Link href={`/${lang}/terms`}>{f.terms}</Link>
          <Link href={`/${lang}/cookies`}>{f.cookies}</Link>
        </span>
      </div>
    </footer>
  );
}
