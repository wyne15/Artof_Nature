import { formatDate } from "@/lib/logistics";
import { formatGBP } from "@/lib/money";
import type { OrderRow } from "@/server/orders";
import { addressLines } from "@/server/orders";
import { clearFlagAction, dispatchAction, setStatusAction } from "@/app/(admin)/admin/actions";

export const STATUS_RO: Record<string, string> = {
  pending: "În așteptare", paid: "Plătită", packed: "Ambalată", dispatched: "Expediată", delivered: "Livrată", refunded: "Rambursată", cancelled: "Anulată",
};

const dateRo = (iso: string) => formatDate(iso.slice(0, 10), "ro", false);

export function OrderCard({ o, back, compact }: { o: OrderRow; back: string; compact?: boolean }) {
  const open = o.status === "paid" || o.status === "packed";
  return (
    <div className="li ord2 pack-card">
      <div className="oi">
        <b>AON-{o.number}</b>
        <span className="od">{dateRo(o.paidAt ?? o.createdAt)}</span>
        <span className="pill" style={{ marginLeft: 10 }}>{STATUS_RO[o.status] ?? o.status}</span>
        <div>{o.name || o.shipName} · <a href={`mailto:${o.email}`}>{o.email}</a></div>
        <ul className="oi-list">{o.items.map((i, k) => <li key={k}>{i.qty} × {i.nameRo}{i.colorRo ? ` (${i.colorRo})` : ""}</li>)}</ul>
        <div className="addr">{addressLines(o).join(", ")}</div>
        {o.dispatchBy && open && <small>De expediat până la: <b>{formatDate(o.dispatchBy, "ro")}</b></small>}
        {o.tracking && <small>Urmărire: {o.tracking}</small>}
        {o.needsAttention && (
          <div className="warnbox">
            <b>Atenție:</b> {o.attentionNote || "Verifică această comandă."}
            {!compact && (
              <form action={clearFlagAction} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={o.id} /><input type="hidden" name="back" value={back} />
                <button className="btn btn-line sm" type="submit">Am rezolvat</button>
              </form>
            )}
          </div>
        )}
      </div>
      <div className="oa" style={{ flexDirection: "column", alignItems: "flex-end" }}>
        <b className="ot">{formatGBP(o.totalPence, "ro")}</b>
        <small>din care livrare {formatGBP(o.shippingPence, "ro")}</small>
      </div>
      {!compact && (
        <div className="no-print" style={{ width: "100%", display: "grid", gap: 10 }}>
          {(open || o.status === "dispatched") && (
            <form action={dispatchAction} className="trk">
              <input type="hidden" name="id" value={o.id} /><input type="hidden" name="back" value={back} />
              <input type="text" name="tracking" placeholder="Număr de urmărire (opțional)" defaultValue={o.tracking ?? ""} maxLength={30} aria-label={`Număr de urmărire pentru AON-${o.number}`} />
              <button className="btn btn-olive sm" type="submit">{o.status === "dispatched" ? "Retrimite emailul" : "Expediat + trimite email"}</button>
            </form>
          )}
          <form action={setStatusAction} className="trk">
            <input type="hidden" name="id" value={o.id} /><input type="hidden" name="back" value={back} />
            <select name="status" defaultValue={o.status === "pending" ? "paid" : o.status} aria-label={`Status AON-${o.number}`}>
              {Object.entries(STATUS_RO).filter(([k]) => k !== "pending").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="btn btn-line sm" type="submit">Schimbă statusul</button>
          </form>
        </div>
      )}
    </div>
  );
}
