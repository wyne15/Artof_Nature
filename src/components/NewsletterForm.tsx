"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Dict } from "@/i18n";
import { EMAIL_RE, postJson } from "./api";

export function NewsletterForm({ lang, t }: { lang: "en" | "ro"; t: Dict["newsletter"] }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setErr(t.errEmail);
    if (!consent) return setErr(t.errConsent);
    setBusy(true);
    const r = await postJson("/api/newsletter", { email: email.trim(), consent: true, website, locale: lang });
    setBusy(false);
    if (r.ok) setDone(true);
    else setErr(r.status === 429 ? t.errRate : t.errGeneric);
  }

  if (done) return <p className="ok" role="status">{t.thanks}</p>;
  return (
    <form className="nform" onSubmit={submit} noValidate>
      <div className="nrow">
        <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder={t.placeholder} autoComplete="email" aria-label={t.label} />
        <button className="btn btn-gold" type="submit" disabled={busy}>{t.subscribe}</button>
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${id}-w`}>Website</label>
        <input id={`${id}-w`} type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label className="chk">
        <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErr(""); }} />
        <span>{t.consent} <Link href={`/${lang}/privacy`}>{t.privacy}</Link>.</span>
      </label>
      <div className="err" role="alert">{err}</div>
    </form>
  );
}
