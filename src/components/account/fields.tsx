"use client";

import { useId, useState } from "react";

export function Field(props: { label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string; hint?: string; maxLength?: number; inputMode?: "numeric" | "text" | "email"; readOnly?: boolean }) {
  const id = useId();
  return (
    <div className="fld">
      <label htmlFor={id}>{props.label}</label>
      <input id={id} type={props.type ?? "text"} value={props.value} onChange={(e) => props.onChange(e.target.value)} autoComplete={props.autoComplete} maxLength={props.maxLength ?? 254} inputMode={props.inputMode} readOnly={props.readOnly} />
      {props.hint && <small>{props.hint}</small>}
    </div>
  );
}

export function PwField(props: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: string; show: string; hide: string; showAria: string; hideAria: string }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="fld">
      <label htmlFor={id}>{props.label}</label>
      <div className="pw">
        <input id={id} type={shown ? "text" : "password"} value={props.value} onChange={(e) => props.onChange(e.target.value)} autoComplete={props.autoComplete} maxLength={128} />
        <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? props.hideAria : props.showAria}>{shown ? props.hide : props.show}</button>
      </div>
      {props.hint && <small>{props.hint}</small>}
    </div>
  );
}
