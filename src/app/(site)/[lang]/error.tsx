"use client";

import { usePathname } from "next/navigation";
import { MINI } from "@/i18n/mini";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const lang = (usePathname() ?? "").startsWith("/ro") ? "ro" : "en";
  const t = MINI[lang].errors;
  return (
    <section className="sec nf">
      <div className="nf-in">
        <h1>{t.title}</h1>
        <p>{t.body}</p>
        <button type="button" className="btn btn-olive" onClick={reset}>{t.retry}</button>
      </div>
    </section>
  );
}
