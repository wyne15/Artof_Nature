import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getDict, isLocale } from "@/i18n";
import { pageMetadata } from "@/lib/seo";

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = (await params).lang === "ro" ? "ro" : "en";
  const d = getDict(l).legal.delivery;
  return pageMetadata({ lang: l, path: "/delivery", title: d.title, description: d.description });
}

export default async function Page({ params }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  return <LegalPage k="delivery" lang={lang} t={getDict(lang)} />;
}
