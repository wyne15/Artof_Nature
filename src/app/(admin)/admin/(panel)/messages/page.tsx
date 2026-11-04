import { AdminFlash } from "@/components/AdminFlash";
import { formatDate } from "@/lib/logistics";
import { requireAdmin } from "@/server/adminAuth";
import { db } from "@/server/db";
import { toggleRepliedAction } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mesaje" };
const TOPIC: Record<string, string> = { order: "O comandă", product: "Un produs", gift: "Cadou / comandă mare", privacy: "Date personale", other: "Altceva" };

export default async function Messages({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireAdmin();
  const { m } = await searchParams;
  const { data } = await db().from("contact_messages").select("*").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <h1>Mesaje</h1>
      <AdminFlash code={m} />
      <div className="list">
        {(data ?? []).length === 0 && <div className="li"><div>Niciun mesaj.</div></div>}
        {(data ?? []).map((x) => (
          <div className="li msgi" key={x.id}>
            <div>
              <b>{x.name}</b><span className="od">{formatDate(String(x.created_at).slice(0, 10), "ro", false)}</span>
              <small>{TOPIC[x.topic] ?? x.topic} · {x.email}</small>
              <p style={{ whiteSpace: "pre-wrap" }}>{x.message}</p>
            </div>
            <div className="ma">
              <a className="btn btn-line sm" href={`mailto:${x.email}?subject=${encodeURIComponent("Re: mesajul tău către Art of Nature")}`}>Răspunde pe email</a>
              <form action={toggleRepliedAction}>
                <input type="hidden" name="id" value={x.id} /><input type="hidden" name="to" value={x.replied ? "0" : "1"} />
                <button className={`btn sm ${x.replied ? "btn-olive" : "btn-line"}`} type="submit">{x.replied ? "Răspuns trimis" : "Marchează ca răspuns"}</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
