import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getDict, isLocale } from "@/i18n";
import { pageMetadata } from "@/lib/seo";

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = (await params).lang === "ro" ? "ro" : "en";
  const d = getDict(l).legal.terms;
  return pageMetadata({ lang: l, path: "/terms", title: d.title, description: d.description });
}

export default async function Page({ params }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  return <LegalPage k="terms" lang={lang} t={getDict(lang)} />;
}
