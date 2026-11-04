"use client";

import { useState } from "react";
import type { Dict } from "@/i18n";
import { fmt } from "@/i18n/fmt";
import { postJson } from "../api";
import { Field, PwField } from "./fields";

export type OrderView = {
  ref: string;
  status: keyof Dict["account"]["status"];
  placed: string;
  items: string[];
  total: string;
  tracking: string | null;
  dispatchBy: string | null;
};
type Tab = "orders" | "details" | "address" | "privacy";

export function AccountPanel(props: {
  lang: "en" | "ro";
  t: Dict["account"];
  firstName: string;
  email: string;
  marketing: boolean;
  address: { line1: string; line2: string; city: string; postcode: string };
  orders: OrderView[];
}) {
  const { t, lang } = props;
  const [tab, setTab] = useState<Tab>("orders");
  const [first, setFirst] = useState(props.firstName);
  const [marketing, setMarketing] = useState(props.marketing);
  const [addr, setAddr] = useState(props.address);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [asking, setAsking] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const pwProps = { show: t.show, hide: t.hide, showAria: t.showPw, hideAria: t.hidePw };

  const switchTab = (x: Tab) => { setTab(x); setMsg(""); setErr(""); setAsking(false); };

  async function saveProfile(e?: React.FormEvent, nextMarketing = marketing) {
    e?.preventDefault();
    if (!first.trim()) return setErr(t.errName);
    const r = await postJson("/api/account/profile", { firstName: first.trim(), marketing: nextMarketing });
    if (r.ok) { setErr(""); setMsg(t.saved); } else setErr(t.errGeneric);
  }
  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    const r = await postJson("/api/account/address", addr);
    if (r.ok) { setErr(""); setMsg(t.addrSaved); } else setErr(r.status === 422 ? t.errAddr : t.errGeneric);
  }
  async function signOut() {
    await postJson("/api/auth/logout", {});
    window.location.assign(`/${lang}/account`);
  }
  async function download() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error("x");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-data-the-art-of-nature.json";
      a.click();
      URL.revokeObjectURL(url);
      setErr("");
    } catch {
      setErr(t.errGeneric);
    }
    setBusy(false);
  }
  async function deleteAccount() {
    setBusy(true);
    const r = await postJson("/api/account/delete", { password: pw, confirm: true });
    setBusy(false);
    if (r.ok) window.location.assign(`/${lang}/account?deleted=1`);
    else setErr(r.status === 401 ? t.errCreds : r.status === 429 ? t.errRate : t.errGeneric);
  }

  const tabs: [Tab, string][] = [["orders", t.tabOrders], ["details", t.tabDetails], ["address", t.tabAddress], ["privacy", t.tabPrivacy]];
  return (
    <section className="sec">
      <div className="acct wide2">
        <div className="ahead">
          <h1>{fmt(t.hello, { name: props.firstName || props.email })}</h1>
          <button type="button" className="lnk" onClick={signOut}>{t.signOut}</button>
        </div>
        <div className="tabs" role="tablist">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" role="tab" className="tabbtn" aria-selected={tab === k} onClick={() => switchTab(k)}>{label}</button>
          ))}
        </div>
        <div className="panel">
          {tab === "orders" &&
            (props.orders.length === 0 ? (
              <div className="empty"><h3>{t.noOrders}</h3><p>{t.noOrdersText}</p></div>
            ) : (
              props.orders.map((o) => (
                <div className="ord" key={o.ref}>
                  <div>
                    <b>{o.ref}</b> <span className="pill">{t.status[o.status]}</span>
                    <ul className="oi-list">{o.items.map((i, k) => <li key={k}>{i}</li>)}</ul>
                    <small>
                      {t.placed} {o.placed}
                      {o.tracking ? ` · ${t.tracking}: ${o.tracking}` : o.dispatchBy && (o.status === "paid" || o.status === "packed") ? ` · ${fmt(t.dispatchBy, { date: o.dispatchBy })}` : ""}
                    </small>
                  </div>
                  <div className="ot">{o.total}</div>
                </div>
              ))
            ))}

          {tab === "details" && (
            <form onSubmit={(e) => saveProfile(e)} noValidate>
              <Field label={t.firstName} value={first} onChange={(v) => { setFirst(v); setMsg(""); }} autoComplete="given-name" maxLength={60} />
              <Field label={t.email} type="email" value={props.email} onChange={() => {}} readOnly />
              <div className="ferr" role="alert" style={err ? undefined : { color: "#2F3817" }}>{err || msg}</div>
              <button className="btn btn-olive" type="submit">{t.save}</button>
            </form>
          )}

          {tab === "address" && (
            <form onSubmit={saveAddress} noValidate>
              <Field label={t.addr1} value={addr.line1} onChange={(v) => setAddr({ ...addr, line1: v })} autoComplete="address-line1" maxLength={100} />
              <Field label={t.addr2} value={addr.line2} onChange={(v) => setAddr({ ...addr, line2: v })} autoComplete="address-line2" maxLength={100} />
              <div className="two">
                <Field label={t.city} value={addr.city} onChange={(v) => setAddr({ ...addr, city: v })} autoComplete="address-level2" maxLength={60} />
                <Field label={t.postcode} value={addr.postcode} onChange={(v) => setAddr({ ...addr, postcode: v })} autoComplete="postal-code" maxLength={10} />
              </div>
              <div className="ferr" role="alert" style={err ? undefined : { color: "#2F3817" }}>{err || msg}</div>
              <button className="btn btn-olive" type="submit">{t.saveAddr}</button>
            </form>
          )}

          {tab === "privacy" && (
            <div className="priv">
              <h3>{t.marketingH}</h3>
              <label className="chk2">
                <input type="checkbox" checked={marketing} onChange={(e) => { setMarketing(e.target.checked); void saveProfile(undefined, e.target.checked); }} />
                <span>{t.marketingLabel}</span>
              </label>
              <h3>{t.dataH}</h3>
              <p>{t.dataP}</p>
              <div className="two">
                <button type="button" className="btn btn-line" onClick={download} disabled={busy}>{t.download}</button>
                <button type="button" className="btn btn-line" onClick={() => { setAsking(true); setErr(""); }}>{t.delete}</button>
              </div>
              {asking && (
                <div className="msg2" role="group" aria-label={t.delete}>
                  <p>{t.deleteAsk}</p>
                  <PwField label={t.password} value={pw} onChange={setPw} autoComplete="current-password" {...pwProps} />
                  <div className="two" style={{ marginTop: 12 }}>
                    <button type="button" className="btn btn-olive" onClick={deleteAccount} disabled={busy || !pw}>{t.deleteYes}</button>
                    <button type="button" className="btn btn-line" onClick={() => { setAsking(false); setPw(""); }}>{t.deleteNo}</button>
                  </div>
                </div>
              )}
              <div className="msg2" role="status" style={{ color: "#8A2C0B" }}>{err}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
