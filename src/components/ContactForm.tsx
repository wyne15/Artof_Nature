"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Dict } from "@/i18n";
import { fmt } from "@/i18n/fmt";
import { EMAIL_RE, postJson } from "./api";

const TOPICS = ["order", "product", "gift", "privacy", "other"] as const;

export function ContactForm({ lang, t }: { lang: "en" | "ro"; t: Dict["contact"] }) {
  const id = useId();
  const [v, setV] = useState({ name: "", email: "", topic: "order" as (typeof TOPICS)[number], message: "", website: "" });
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ name: string; email: string } | null>(null);
  const started = useRef(0);
  useEffect(() => { started.current = Date.now(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.name.trim()) return setErr(t.errName);
    if (!EMAIL_RE.test(v.email.trim())) return setErr(t.errEmail);
    if (v.message.trim().length < 10) return setErr(t.errMessage);
    if (!consent) return setErr(t.errConsent);
    setBusy(true);
    const r = await postJson("/api/contact", { ...v, name: v.name.trim(), email: v.email.trim(), message: v.message.trim(), consent: true, elapsedMs: Date.now() - started.current, locale: lang });
    setBusy(false);
    if (r.ok) setSent({ name: v.name.trim(), email: v.email.trim() });
    else setErr(r.status === 429 ? t.errRate : t.errGeneric);
  }

  if (sent) {
    return (
      <div className="panel full">
        <div className="msg" role="status">
          <h2>{t.sentH}</h2>
          <p>{fmt(t.sentP, sent)}</p>
        </div>
      </div>
    );
  }
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setV({ ...v, [k]: e.target.value }); setErr(""); };
  return (
    <form className="panel full" onSubmit={submit} noValidate>
      <div className="fld"><label htmlFor={`${id}n`}>{t.name}</label><input id={`${id}n`} type="text" autoComplete="name" maxLength={100} value={v.name} onChange={set("name")} /></div>
      <div className="fld"><label htmlFor={`${id}e`}>{t.emailField}</label><input id={`${id}e`} type="email" autoComplete="email" maxLength={254} value={v.email} onChange={set("email")} /></div>
      <div className="fld">
        <label htmlFor={`${id}t`}>{t.topic}</label>
        <select id={`${id}t`} value={v.topic} onChange={set("topic")}>
          {TOPICS.map((k) => <option key={k} value={k}>{t.topics[k]}</option>)}
        </select>
      </div>
      <div className="fld"><label htmlFor={`${id}m`}>{t.message}</label><textarea id={`${id}m`} rows={5} maxLength={4000} value={v.message} onChange={set("message")} /></div>
      <div className="hp" aria-hidden="true"><label>{t.honeypot}<input type="text" tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} /></label></div>
      <label className="chk2">
        <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErr(""); }} />
        <span>{t.consent} <Link href={`/${lang}/privacy`}>{t.privacy}</Link>.</span>
      </label>
      <div className="ferr" role="alert">{err}</div>
      <button className="btn btn-olive wide" type="submit" disabled={busy}>{busy ? t.sending : t.send}</button>
    </form>
  );
}
