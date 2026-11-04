import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/account/TokenAction";
import { getDict, isLocale } from "@/i18n";
import { pageMetadata } from "@/lib/seo";
import { readResetWindow } from "@/server/session";

type P = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = (await params).lang === "ro" ? "ro" : "en";
  return { ...pageMetadata({ lang: l, path: "/account/reset", title: getDict(l).confirm.resetH, description: getDict(l).confirm.resetH, noindex: true }), referrer: "no-referrer" };
}

export default async function Reset({ params }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const t = getDict(lang);
  const c = t.confirm;
  if (!(await readResetWindow())) {
    return (
      <section className="sec"><div className="acct"><h1>{c.resetH}</h1>
        <p className="ferr" role="alert" style={{ color: "#8A2C0B" }}>{c.resetExpired}</p>
        <Link className="btn btn-olive" href={`/${lang}/account`}>{t.account.backToSignIn}</Link>
      </div></section>
    );
  }
  return (
    <ResetPasswordForm
      title={c.resetH}
      label={t.account.password}
      hint={t.account.pwHint}
      button={c.resetBtn}
      done={c.resetDone}
      signIn={t.account.signIn}
      signInHref={`/${lang}/account`}
      errors={t.account.pw}
      generic={t.account.errGeneric}
      show={t.account.show} hide={t.account.hide} showAria={t.account.showPw} hideAria={t.account.hidePw}
    />
  );
}
