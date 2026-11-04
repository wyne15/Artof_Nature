import { BUSINESS, SITE, businessTodos } from "@/config/site";
import type { Dict } from "@/i18n";
import { fmt } from "@/i18n/fmt";
import { formatGBP, type Locale } from "@/lib/money";
import { getSettings } from "@/server/settings";

type Key = "privacy" | "terms" | "cookies" | "delivery" | "returns";

function policyDate(lang: Locale): string {
  const [y, m] = SITE.policyVersion.split("-").map(Number) as [number, number];
  const en = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const ro = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  return `${(lang === "ro" ? ro : en)[m - 1]} ${y}`;
}

export async function LegalPage({ k, lang, t }: { k: Key; lang: Locale; t: Dict }) {
  const doc = t.legal[k];
  const s = await getSettings();
  const vars = {
    legalName: BUSINESS.legalName,
    address: BUSINESS.address,
    email: BUSINESS.email,
    ico: BUSINESS.icoNumber,
    ship: formatGBP(s.shippingPence, lang),
    free: formatGBP(s.freeThresholdPence, lang),
  };
  const draft = process.env.NEXT_PUBLIC_LEGAL_REVIEWED !== "true" || businessTodos().length > 0;
  return (
    <section className="sec">
      <article className="legal">
        <h1>{doc.title}</h1>
        <p className="sub2">{doc.intro}</p>
        {draft && <div className="draft" role="note">{t.legal.draft}</div>}
        {doc.sections.map((sec) => (
          <div key={sec.h}>
            <h2>{sec.h}</h2>
            {sec.p.filter((p) => !(p.includes("{ico}") && !BUSINESS.icoNumber)).map((p, i) => <p key={i}>{fmt(p, vars)}</p>)}
          </div>
        ))}
        <p className="upd">{fmt(t.legal.updated, { date: policyDate(lang) })}</p>
      </article>
    </section>
  );
}
