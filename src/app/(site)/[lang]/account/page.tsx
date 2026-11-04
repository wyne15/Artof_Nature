import type { Metadata } from "next";
import { AccountPanel, type OrderView } from "@/components/account/AccountPanel";
import { AuthPanel } from "@/components/account/AuthPanel";
import { getDict, isLocale } from "@/i18n";
import { formatDate } from "@/lib/logistics";
import { formatGBP, type Locale } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";
import { itemLabel, listOrdersForUser } from "@/server/orders";
import { getSession } from "@/server/session";

type P = { params: Promise<{ lang: string }>; searchParams: Promise<{ deleted?: string; confirmed?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = (await params).lang === "ro" ? "ro" : "en";
  return pageMetadata({ lang: l, path: "/account", title: getDict(l).nav.account, description: getDict(l).account.guestSub, noindex: true });
}

const day = (iso: string, lang: Locale) => formatDate(iso.slice(0, 10), lang, false);

export default async function Account({ params, searchParams }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const q = await searchParams;
  const t = getDict(lang).account;
  const session = await getSession();

  if (!session) {
    const flash = q.deleted ? t.deleted : q.confirmed ? t.confirmedMsg : undefined;
    return <AuthPanel lang={lang} t={t} flash={flash} />;
  }
  const orders = await listOrdersForUser(session.userId, session.email);
  const views: OrderView[] = orders.map((o) => ({
    ref: `AON-${o.number}`,
    status: (o.status in t.status ? o.status : "paid") as OrderView["status"],
    placed: day(o.paidAt ?? o.createdAt, lang),
    items: o.items.map((i) => `${itemLabel(i, lang)} × ${i.qty}`),
    total: formatGBP(o.totalPence, lang),
    tracking: o.tracking,
    dispatchBy: o.dispatchBy ? formatDate(o.dispatchBy, lang) : null,
  }));
  return <AccountPanel lang={lang} t={t} firstName={session.firstName} email={session.email} marketing={session.marketing} address={session.address} orders={views} />;
}
