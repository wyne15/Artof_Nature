import { OrderCard } from "@/components/AdminOrder";
import { AdminFlash } from "@/components/AdminFlash";
import { PrintButton } from "@/components/AdminParts";
import { formatDate } from "@/lib/logistics";
import { requireAdmin } from "@/server/adminAuth";
import { listOrdersByStatus } from "@/server/orders";

export const dynamic = "force-dynamic";
export const metadata = { title: "De ambalat" };

export default async function Pack({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireAdmin();
  const { m } = await searchParams;
  const orders = (await listOrdersByStatus(["paid", "packed"])).sort((a, b) => (a.dispatchBy ?? "9").localeCompare(b.dispatchBy ?? "9") || (a.paidAt ?? "").localeCompare(b.paidAt ?? ""));
  const days = new Map<string, typeof orders>();
  for (const o of orders) {
    const k = o.dispatchBy ?? "fără dată";
    days.set(k, [...(days.get(k) ?? []), o]);
  }
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <div className="ahead"><h1>De ambalat</h1><PrintButton label="Printează lista" /></div>
      <p className="sub2">Comenzile sunt grupate după data până la care le-ai promis. Cele mai urgente sunt primele. La fiecare, poți nota numărul de urmărire și trimite emailul.</p>
      <AdminFlash code={m} />
      {orders.length === 0 && <div className="li"><div>Nu ai nimic de ambalat acum.</div></div>}
      {[...days.entries()].map(([day, list]) => (
        <section className="pack-day" key={day}>
          <h2>{day === "fără dată" ? day : formatDate(day, "ro")}{day !== "fără dată" && day < today ? " · întârziate" : day === today ? " · azi" : ""} <small style={{ fontSize: 16, color: "var(--muted)" }}>({list.length})</small></h2>
          <div className="list">{list.map((o) => <OrderCard key={o.id} o={o} back="/admin/pack" />)}</div>
        </section>
      ))}
    </>
  );
}
