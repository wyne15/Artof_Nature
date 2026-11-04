import { AdminFlash } from "@/components/AdminFlash";
import { formatDate } from "@/lib/logistics";
import { requireAdmin } from "@/server/adminAuth";
import { getShopInfo } from "@/server/settings";
import { addClosureAction, removeClosureAction, saveSettingsAction } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Setări și program" };

const DAYS: [number, string][] = [[1, "Luni"], [2, "Marți"], [3, "Miercuri"], [4, "Joi"], [5, "Vineri"], [6, "Sâmbătă"], [0, "Duminică"]];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireAdmin();
  const { m } = await searchParams;
  const { settings: s, status, estimate } = await getShopInfo();
  const sc = s.schedule;
  const gbp = (p: number) => (p / 100).toFixed(2);
  return (
    <>
      <h1>Setări și program</h1>
      <p className="sub2">De aici controlezi prețul livrării, cât timp îți ia o comandă, orele tale de lucru și vacanțele. Clienții văd data estimată de expediere înainte să plătească.</p>
      <AdminFlash code={m} />
      <div className="warnbox">
        Acum: magazinul este <b>{status.state === "open" ? "deschis" : status.state === "away" ? "închis, dar primește comenzi" : "oprit"}</b>. O comandă plasată acum ar fi expediată între <b>{formatDate(estimate.earliest, "ro")}</b> și <b>{formatDate(estimate.latest, "ro")}</b>.
      </div>

      <form action={saveSettingsAction} className="adm-card stack">
        <h2>Livrare</h2>
        <div className="row2">
          <label className="f">Cost livrare UK (£)<input name="shipping" inputMode="decimal" defaultValue={gbp(s.shippingPence)} required /></label>
          <label className="f">Livrare gratuită peste (£)<input name="freeOver" inputMode="decimal" defaultValue={gbp(s.freeThresholdPence)} required /></label>
        </div>
        <h2>Program de lucru</h2>
        <div className="days" role="group" aria-label="Zile de lucru">
          {DAYS.map(([v, l]) => <label className="chk3" key={v}><input type="checkbox" name="days" value={v} defaultChecked={sc.workingDays.includes(v)} />{l}</label>)}
        </div>
        <div className="row2">
          <label className="f">De la ora<input name="startHour" inputMode="numeric" defaultValue={sc.startHour} required /></label>
          <label className="f">Până la ora<input name="endHour" inputMode="numeric" defaultValue={sc.endHour} required /></label>
          <label className="f">Comenzile de dinainte de ora… se pun în lucru în aceeași zi<input name="cutoffHour" inputMode="numeric" defaultValue={sc.cutoffHour} required /></label>
        </div>
        <h2>Cât durează o comandă</h2>
        <div className="row2">
          <label className="f">Minim (zile lucrătoare)<input name="leadMin" inputMode="numeric" defaultValue={sc.leadMinDays} required /></label>
          <label className="f">Maxim (zile lucrătoare)<input name="leadMax" inputMode="numeric" defaultValue={sc.leadMaxDays} required /></label>
          <label className="f">Câte comenzi poți face pe zi<input name="dailyCap" inputMode="numeric" defaultValue={sc.dailyCap} required /></label>
        </div>
        <p className="fnote">Dacă într-o zi ai deja numărul maxim de comenzi, următoarele primesc automat o dată mai târzie, ca promisiunea către client să rămână sinceră.</p>
        <label className="chk3"><input type="checkbox" name="manualPause" defaultChecked={s.manualPause} /> Oprește comenzile acum (butonul de plată se dezactivează)</label>
        <div><button className="btn btn-olive" type="submit">Salvează setările</button></div>
      </form>

      <h2 className="h2s">Vacanțe și zile libere</h2>
      <p className="sub2">„Primește comenzi” înseamnă că magazinul rămâne deschis, dar toate datele de expediere se mută după vacanță (potrivit pentru vacanța copilului). „Oprit” dezactivează plata în acea perioadă.</p>
      <div className="list">
        {sc.closures.length === 0 && <div className="li"><div>Nicio perioadă adăugată.</div></div>}
        {sc.closures.map((c, i) => (
          <div className="li" key={`${c.from}-${i}`}>
            <div><b>{formatDate(c.from, "ro")} – {formatDate(c.to, "ro")}</b><small>{c.mode === "paused" ? "Oprit" : "Primește comenzi"}{c.noteRo ? ` · ${c.noteRo}` : ""}</small></div>
            <form action={removeClosureAction}><input type="hidden" name="index" value={i} /><button className="btn btn-line sm" type="submit">Șterge</button></form>
          </div>
        ))}
      </div>
      <form action={addClosureAction} className="adm-card stack">
        <h2>Adaugă o perioadă</h2>
        <div className="row2">
          <label className="f">De la<input type="date" name="from" required /></label>
          <label className="f">Până la (inclusiv)<input type="date" name="to" required /></label>
          <label className="f">Tip<select name="mode" defaultValue="open"><option value="open">Primește comenzi, expediez după</option><option value="paused">Oprit (fără plată)</option></select></label>
        </div>
        <div className="row2">
          <label className="f">Mesaj pe site, în română (opțional)<input name="note" maxLength={200} placeholder="Atelierul este în vacanță" /></label>
          <label className="f">Mesaj pe site, în engleză (opțional)<input name="noteEn" maxLength={200} placeholder="The workshop is on holiday" /></label>
        </div>
        <div><button className="btn btn-olive" type="submit">Adaugă</button></div>
      </form>
    </>
  );
}
