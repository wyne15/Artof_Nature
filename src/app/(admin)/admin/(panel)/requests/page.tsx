import { AdminFlash } from "@/components/AdminFlash";
import { requireAdmin } from "@/server/adminAuth";
import { db } from "@/server/db";
import { addRequestAction, completeRequestAction } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cereri GDPR" };
const KIND: Record<string, string> = { export: "Export de date", delete: "Ștergere cont / date", other: "Altă cerere" };

export default async function Requests({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireAdmin();
  const { m } = await searchParams;
  const { data } = await db().from("data_requests").select("*").order("status", { ascending: true }).order("due_at", { ascending: true }).limit(100);
  const days = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return (
    <>
      <h1>Cereri GDPR</h1>
      <p className="sub2">Legea îți cere să răspunzi în cel mult o lună. Exporturile și ștergerile făcute de clienți din cont apar aici ca „rezolvate”. Cererile primite pe email le notezi tu mai jos.</p>
      <AdminFlash code={m} />
      <div className="list">
        {(data ?? []).length === 0 && <div className="li"><div>Nicio cerere.</div></div>}
        {(data ?? []).map((r) => (
          <div className="li" key={r.id}>
            <div><b>{KIND[r.kind] ?? r.kind}</b><small>{r.email}{r.note ? ` · ${r.note}` : ""} · {r.status === "done" ? "Rezolvată" : `${Math.max(days(r.due_at), 0)} zile rămase`}</small></div>
            {r.status === "open" ? (
              <form action={completeRequestAction}><input type="hidden" name="id" value={r.id} /><button className="btn btn-olive sm" type="submit">Am rezolvat</button></form>
            ) : <span className="pill">Rezolvată</span>}
          </div>
        ))}
      </div>
      <h2 className="h2s">Notează o cerere primită pe email</h2>
      <form action={addRequestAction} className="adm-card stack">
        <div className="row2">
          <label className="f">Email-ul persoanei<input name="email" type="email" required maxLength={254} /></label>
          <label className="f">Tip<select name="kind" defaultValue="export"><option value="export">Export de date</option><option value="delete">Ștergere</option><option value="other">Altceva</option></select></label>
        </div>
        <label className="f">Notă (opțional)<input name="note" maxLength={500} /></label>
        <div><button className="btn btn-olive" type="submit">Adaugă</button></div>
        <p className="fnote">Pentru o ștergere: Supabase → Authentication → Users → șterge utilizatorul; apoi șterge rândurile din newsletter_subscribers și contact_messages cu acel email. Comenzile se păstrează 6 ani (obligație fiscală).</p>
      </form>
    </>
  );
}
