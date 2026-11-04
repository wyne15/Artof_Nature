"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ items }: { items: { href: string; label: string; badge?: number }[] }) {
  const path = usePathname() ?? "";
  return (
    <nav aria-label="Administrare">
      {items.map((it) => {
        const current = it.href === "/admin" ? path === "/admin" : path === it.href || path.startsWith(`${it.href}/`);
        return (
          <Link key={it.href} href={it.href} aria-current={current ? "page" : undefined}>
            {it.label}
            {it.badge ? <i>{it.badge}</i> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function PrintButton({ label }: { label: string }) {
  return <button type="button" className="btn btn-line sm no-print" onClick={() => window.print()}>{label}</button>;
}
