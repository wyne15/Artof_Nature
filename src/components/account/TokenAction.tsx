"use client";

import Link from "next/link";
import { useState } from "react";
import { postJson } from "../api";
import { PwField } from "./fields";

/** One button that spends a single-use token. Links in emails only open this page; the button does the work. */
export function TokenAction(props: {
  endpoint: string;
  body: Record<string, unknown>;
  title: string;
  text: string;
  button: string;
  okText: string;
  badText: string;
  /** where to go on success: a link under the message, or an automatic redirect */
  after?: { href: string; label: string };
  redirectOn?: Record<string, string>;
}) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "bad">("idle");
  async function run() {
    setState("busy");
    const r = await postJson(props.endpoint, props.body);
    if (!r.ok) return setState("bad");
    const to = r.next && props.redirectOn?.[r.next];
    if (to) return void window.location.assign(to);
    setState("ok");
  }
  return (
    <section className="sec">
      <div className="acct">
        <h1>{props.title}</h1>
        <div className="panel" style={{ borderTop: "1px solid var(--line)", borderRadius: 14, marginTop: 18 }}>
          {state === "ok" ? (
            <div className="msg" role="status">
              <p>{props.okText}</p>
              {props.after && <Link className="btn btn-olive wide" href={props.after.href}>{props.after.label}</Link>}
            </div>
          ) : state === "bad" ? (
            <p className="ferr" role="alert" style={{ color: "#8A2C0B" }}>{props.badText}</p>
          ) : (
            <>
              <p className="lead2">{props.text}</p>
              <button type="button" className="btn btn-olive wide" onClick={run} disabled={state === "busy"}>{props.button}</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function ResetPasswordForm(props: {
  title: string;
  label: string;
  hint: string;
  button: string;
  done: string;
  signIn: string;
  signInHref: string;
  errors: Record<string, string>;
  generic: string;
  show: string; hide: string; showAria: string; hideAria: string;
}) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await postJson("/api/auth/reset-password", { password: pw });
    setBusy(false);
    if (r.ok) return setOk(true);
    setErr(r.reason && props.errors[r.reason] ? props.errors[r.reason]! : props.generic);
  }
  return (
    <section className="sec">
      <div className="acct">
        <h1>{props.title}</h1>
        <div className="panel" style={{ borderTop: "1px solid var(--line)", borderRadius: 14, marginTop: 18 }}>
          {ok ? (
            <div className="msg" role="status">
              <p>{props.done}</p>
              <Link className="btn btn-olive wide" href={props.signInHref}>{props.signIn}</Link>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <PwField label={props.label} value={pw} onChange={(v) => { setPw(v); setErr(""); }} autoComplete="new-password" hint={props.hint} show={props.show} hide={props.hide} showAria={props.showAria} hideAria={props.hideAria} />
              <div className="ferr" role="alert">{err}</div>
              <button className="btn btn-olive wide" type="submit" disabled={busy || pw.length < 10}>{props.button}</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
