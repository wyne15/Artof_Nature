"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action}>
      <div className="fld"><label htmlFor="ae">Email</label><input id="ae" name="email" type="email" autoComplete="username" required maxLength={254} /></div>
      <div className="fld"><label htmlFor="ap">Parolă</label><input id="ap" name="password" type="password" autoComplete="current-password" required maxLength={128} /></div>
      <div className="fld"><label htmlFor="ac">Cod din aplicația de autentificare</label><input id="ac" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} /></div>
      <div className="ferr" role="alert">{state.error}</div>
      <button className="btn btn-olive wide" type="submit" disabled={pending}>{pending ? "Se verifică…" : "Intră"}</button>
    </form>
  );
}
