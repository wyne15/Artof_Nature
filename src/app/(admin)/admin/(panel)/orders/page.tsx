import Link from "next/link";
import { OrderCard } from "@/components/AdminOrder";
import { AdminFlash } from "@/components/AdminFlash";
import { requireAdmin } from "@/server/adminAuth";
import { listOrdersByStatus } from "@/server/orders";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comenzi" };

const FILTERS: Record<string, { label: string; statuses: string[] | null }> = {
  pack: { label: "De ambalat", statuses: ["paid", "packed"] },
  dispatched: { label: "Expediate", statuses: ["dispatched"] },
  delivered: { label: "Livrate", statuses: ["delivered"] },
  closed: { label: "Rambursate / anulate", statuses: ["refunded", "cancelled"] },
  all: { label: "Toate", statuses: null },
};

export default async function Orders({ searchParams }: { searchParams: Promise<{ s?: string; m?: string }> }) {
  await requireAdmin();
  const { s, m } = await searchParams;
  const key = s && s in FILTERS ? s : "all";
  const orders = await listOrdersByStatus(FILTERS[key]!.statuses);
  return (
    <>
      <h1>Comenzi</h1>
      <p className="sub2">Clientul primește email automat când marchezi comanda ca expediată. Rambursările se fac mai întâi în Stripe, apoi schimbă aici statusul.</p>
      <AdminFlash code={m} />
      <div className="adm-tabs">
        {Object.entries(FILTERS).map(([k, f]) => <Link key={k} href={`/admin/orders?s=${k}`} aria-current={k === key ? "page" : undefined}>{f.label}</Link>)}
      </div>
      <div className="list">
        {orders.length === 0 ? <div className="li"><div>Nicio comandă aici.</div></div> : orders.map((o) => <OrderCard key={o.id} o={o} back={`/admin/orders?s=${key}`} />)}
      </div>
    </>
  );
}
