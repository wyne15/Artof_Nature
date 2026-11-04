"use client";

import Link from "next/link";
import { useState } from "react";
import type { Dict } from "@/i18n";
import { fmt } from "@/i18n/fmt";
import { EMAIL_RE, postJson, type ApiResult } from "../api";
import { Field, PwField } from "./fields";

type Mode = "in" | "up" | "reset" | "sent" | "resetsent";

export function AuthPanel({ lang, t, flash }: { lang: "en" | "ro"; t: Dict["account"]; flash?: string }) {
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [terms, setTerms] = useState(false);
  const [mk, setMk] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (m: Mode) => { setMode(m); setErr(""); };
  const pwProps = { show: t.show, hide: t.hide, showAria: t.showPw, hideAria: t.hidePw };
  const weak = (r: ApiResult) => (r.reason && r.reason in t.pw ? t.pw[r.reason as keyof typeof t.pw] : t.errGeneric);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim()) || !pw) return setErr(t.errCreds);
    setBusy(true);
    const r = await postJson("/api/auth/login", { email: email.trim(), password: pw, locale: lang });
    if (r.ok) return void window.location.assign(`/${lang}/account`);
    setBusy(false);
    setErr(r.error === "email_not_confirmed" ? t.errUnconfirmed : r.status === 429 ? t.errRate : r.status === 401 ? t.errCreds : t.errGeneric);
  }
  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr(t.errName);
    if (!EMAIL_RE.test(email.trim())) return setErr(t.errEmail);
    if (pw.length < 10) return setErr(t.pw.too_short);
    if (!terms) return setErr(t.errTerms);
    setBusy(true);
    const r = await postJson("/api/auth/register", { firstName: name.trim(), email: email.trim(), password: pw, acceptTerms: true, marketing: mk, locale: lang });
    setBusy(false);
    if (r.ok) { setPw(""); go("sent"); }
    else setErr(r.error === "weak_password" ? weak(r) : r.status === 429 ? t.errRate : t.errGeneric);
  }
  async function reset(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setErr(t.errEmail);
    setBusy(true);
    const r = await postJson("/api/auth/reset-request", { email: email.trim(), locale: lang });
    setBusy(false);
    if (r.ok) go("resetsent");
    else setErr(r.status === 429 ? t.errRate : t.errGeneric);
  }

  const tabs = mode === "in" || mode === "up";
  return (
    <section className="sec">
      <div className="acct">
        <h1>{mode === "up" ? t.h1Create : t.h1Guest}</h1>
        <p className="sub2">{tabs ? t.guestSub : ""}</p>
        {flash && <div className="flash" role="status">{flash}</div>}
        {tabs && (
          <div className="tabs" role="tablist">
            <button type="button" role="tab" className="tabbtn" aria-selected={mode === "in"} onClick={() => go("in")}>{t.tabIn}</button>
            <button type="button" role="tab" className="tabbtn" aria-selected={mode === "up"} onClick={() => go("up")}>{t.tabUp}</button>
          </div>
        )}
        <div className="panel">
          {mode === "in" && (
            <form onSubmit={signIn} noValidate>
              <Field label={t.email} type="email" value={email} onChange={(v) => { setEmail(v); setErr(""); }} autoComplete="email" />
              <PwField label={t.password} value={pw} onChange={(v) => { setPw(v); setErr(""); }} autoComplete="current-password" {...pwProps} />
              <div className="ferr" role="alert">{err}</div>
              <button className="btn btn-olive wide" type="submit" disabled={busy}>{t.signIn}</button>
              <p className="alt"><button type="button" className="lnk" onClick={() => go("reset")}>{t.forgot}</button></p>
            </form>
          )}
          {mode === "up" && (
            <form onSubmit={signUp} noValidate>
              <Field label={t.firstName} value={name} onChange={(v) => { setName(v); setErr(""); }} autoComplete="given-name" maxLength={60} />
              <Field label={t.email} type="email" value={email} onChange={(v) => { setEmail(v); setErr(""); }} autoComplete="email" />
              <PwField label={t.password} value={pw} onChange={(v) => { setPw(v); setErr(""); }} autoComplete="new-password" hint={t.pwHint} {...pwProps} />
              <label className="chk2">
                <input type="checkbox" checked={terms} onChange={(e) => { setTerms(e.target.checked); setErr(""); }} />
                <span>{t.terms1} <Link href={`/${lang}/privacy`}>{t.terms2}</Link> {t.terms3} <Link href={`/${lang}/terms`}>{t.terms4}</Link>{t.terms5}</span>
              </label>
              <label className="chk2">
                <input type="checkbox" checked={mk} onChange={(e) => setMk(e.target.checked)} />
                <span>{t.marketing}</span>
              </label>
              <div className="ferr" role="alert">{err}</div>
              <button className="btn btn-olive wide" type="submit" disabled={busy}>{busy ? t.creating : t.createBtn}</button>
            </form>
          )}
          {mode === "reset" && (
            <form onSubmit={reset} noValidate>
              <p className="lead2">{t.resetLead}</p>
              <Field label={t.email} type="email" value={email} onChange={(v) => { setEmail(v); setErr(""); }} autoComplete="email" />
              <div className="ferr" role="alert">{err}</div>
              <button className="btn btn-olive wide" type="submit" disabled={busy}>{t.resetBtn}</button>
              <p className="alt"><button type="button" className="lnk" onClick={() => go("in")}>{t.backToSignIn}</button></p>
            </form>
          )}
          {mode === "sent" && (
            <div className="msg" role="status">
              <h2>{t.sentH}</h2>
              <p>{fmt(t.sentP, { email: email.trim() })}</p>
            </div>
          )}
          {mode === "resetsent" && (
            <div className="msg" role="status">
              <h2>{t.sentH}</h2>
              <p>{t.resetSentP}</p>
              <button type="button" className="btn btn-line wide" onClick={() => go("in")}>{t.backToSignIn}</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
