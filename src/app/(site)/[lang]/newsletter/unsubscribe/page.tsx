import type { Metadata } from "next";
import { TokenAction } from "@/components/account/TokenAction";
import { getDict, isLocale } from "@/i18n";
import { pageMetadata } from "@/lib/seo";

type P = { params: Promise<{ lang: string }>; searchParams: Promise<{ t?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = (await params).lang === "ro" ? "ro" : "en";
  return { ...pageMetadata({ lang: l, path: "/newsletter/unsubscribe", title: getDict(l).confirm.unH, description: getDict(l).confirm.unP, noindex: true }), referrer: "no-referrer" };
}

export default async function Page({ params, searchParams }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const { t } = await searchParams;
  const c = getDict(lang).confirm;
  if (!t || t.length > 1000) return <section className="sec"><div className="acct"><h1>{c.unH}</h1><p className="ferr" role="alert" style={{ color: "#8A2C0B" }}>{c.bad}</p></div></section>;
  return <TokenAction endpoint="/api/newsletter/unsubscribe" body={{ token: t }} title={c.unH} text={c.unP} button={c.unBtn} okText={c.unOk} badText={c.bad} />;
}
