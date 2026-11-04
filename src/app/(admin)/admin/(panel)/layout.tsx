import Link from "next/link";
import { AdminNav } from "@/components/AdminParts";
import { requireAdmin } from "@/server/adminAuth";
import { db } from "@/server/db";
import { logoutAction } from "../actions";

export default async function Panel({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [pack, msgs, reqs] = await Promise.all([
    db().from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "packed"]),
    db().from("contact_messages").select("id", { count: "exact", head: true }).eq("replied", false),
    db().from("data_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const items = [
    { href: "/admin", label: "Prezentare" },
    { href: "/admin/pack", label: "De ambalat", badge: pack.count ?? 0 },
    { href: "/admin/orders", label: "Comenzi" },
    { href: "/admin/products", label: "Produse" },
    { href: "/admin/messages", label: "Mesaje", badge: msgs.count ?? 0 },
    { href: "/admin/requests", label: "Cereri GDPR", badge: reqs.count ?? 0 },
    { href: "/admin/settings", label: "Setări și program" },
  ];
  return (
    <div className="adm-wrap">
      <aside className="adm-side">
        <div className="adm-brand">Art of Nature<small>Administrare</small></div>
        <AdminNav items={items} />
        <div className="adm-foot">
          <Link href="/en" target="_blank" rel="noopener">Vezi magazinul</Link>
          <form action={logoutAction}><button type="submit">Ieși</button></form>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
