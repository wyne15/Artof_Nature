import type { Metadata } from "next";
import { TokenAction } from "@/components/account/TokenAction";
import { getDict, isLocale } from "@/i18n";
import { pageMetadata } from "@/lib/seo";

type P = { params: Promise<{ lang: string }>; searchParams: Promise<{ type?: string; th?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = (await params).lang === "ro" ? "ro" : "en";
  return { ...pageMetadata({ lang: l, path: "/account/confirm", title: getDict(l).confirm.signupH, description: getDict(l).confirm.signupP, noindex: true }), referrer: "no-referrer" };
}

export default async function Confirm({ params, searchParams }: P) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "en";
  const { type, th } = await searchParams;
  const c = getDict(lang).confirm;
  const valid = (type === "signup" || type === "recovery") && typeof th === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(th);
  if (!valid) {
    return <section className="sec"><div className="acct"><h1>{c.signupH}</h1><p className="ferr" role="alert" style={{ color: "#8A2C0B" }}>{c.bad}</p></div></section>;
  }
  const signup = type === "signup";
  return (
    <TokenAction
      endpoint="/api/auth/confirm"
      body={{ tokenHash: th, type }}
      title={signup ? c.signupH : c.recoveryH}
      text={signup ? c.signupP : c.recoveryP}
      button={signup ? c.signupBtn : c.recoveryBtn}
      okText={c.okSignup}
      badText={c.bad}
      after={{ href: `/${lang}/account?confirmed=1`, label: c.signInNow }}
      redirectOn={{ reset: `/${lang}/account/reset` }}
    />
  );
}
