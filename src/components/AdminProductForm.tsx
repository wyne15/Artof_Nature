import type { Product } from "@/server/catalog";
import { saveProductAction } from "@/app/(admin)/admin/actions";
import { AdminOffers } from "./AdminOffers";
import { AdminProductMedia } from "./AdminProductMedia";

const KINDS = [["candle", "Lumânare (borcan)"], ["tin", "Cutie metalică"], ["balm", "Balsam (cutie joasă)"], ["tube", "Tub"], ["cream", "Borcan cremă"], ["set", "Set cadou"]] as const;

export function AdminProductForm({ p }: { p?: Product }) {
  return (
    <form action={saveProductAction} className="adm-card stack">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="row2">
        <label className="f">Adresa în URL (slug)<input name="slug" defaultValue={p?.slug ?? ""} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} placeholder="ex: lumanare-lavanda" /></label>
        <label className="f">Categorie
          <select name="category" defaultValue={p?.category ?? "candles"}><option value="candles">Lumânări</option><option value="skincare">Îngrijire</option><option value="gifts">Seturi cadou</option></select>
        </label>
        <label className="f">Preț (£)<input name="price" inputMode="decimal" defaultValue={p ? (p.pricePence / 100).toFixed(2) : ""} required placeholder="24.00" /></label>
        <label className="f">Stoc<input name="stock" inputMode="numeric" defaultValue={p?.stock ?? 0} required /></label>
      </div>
      <div className="row2">
        <label className="f">Nume (engleză)<input name="nameEn" defaultValue={p?.nameEn ?? ""} required maxLength={120} /></label>
        <label className="f">Nume (română)<input name="nameRo" defaultValue={p?.nameRo ?? ""} required maxLength={120} /></label>
      </div>
      <div className="row2">
        <label className="f">Notă scurtă (engleză)<input name="noteEn" defaultValue={p?.noteEn ?? ""} maxLength={160} /></label>
        <label className="f">Notă scurtă (română)<input name="noteRo" defaultValue={p?.noteRo ?? ""} maxLength={160} /></label>
      </div>
      <AdminOffers
        initial={[
          { qty: p?.multiQty ?? 0, pricePence: p?.multiPricePence ?? 0 },
          { qty: p?.multi2Qty ?? 0, pricePence: p?.multi2PricePence ?? 0 },
          { qty: p?.multi3Qty ?? 0, pricePence: p?.multi3PricePence ?? 0 },
        ]}
      />
      <label className="f">Descriere (engleză)<textarea name="descEn" defaultValue={p?.descEn ?? ""} required maxLength={1500} /></label>
      <label className="f">Descriere (română)<textarea name="descRo" defaultValue={p?.descRo ?? ""} required maxLength={1500} /></label>
      <div className="row2">
        <label className="f">Format (engleză)<input name="formatEn" defaultValue={p?.formatEn ?? ""} maxLength={80} placeholder="Tin" /></label>
        <label className="f">Format (română)<input name="formatRo" defaultValue={p?.formatRo ?? ""} maxLength={80} placeholder="Cutie metalică" /></label>
        <label className="f">Etichetă
          <select name="tag" defaultValue={p?.tag ?? ""}><option value="">Fără</option><option value="best_seller">Cel mai vândut</option><option value="popular">Popular</option><option value="new">Nou</option><option value="gift_set">Set cadou</option></select>
        </label>
      </div>
      <div className="row2">
        <label className="f">Ilustrație (până ai fotografii)
          <select name="artKind" defaultValue={p?.artKind ?? "candle"}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="f">Culoarea recipientului<input name="artColor" type="color" defaultValue={p?.artColor ?? "#C9993A"} /></label>
        <label className="f">Culoarea cerii<input name="artWax" type="color" defaultValue={p?.artWax ?? "#EBCB7D"} /></label>
      </div>
      <AdminProductMedia base={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} initialImages={p?.images ?? []} initialColors={p?.colors ?? []} />
      <label className="chk3"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Se vinde (apare în magazin)</label>
      <div><button className="btn btn-olive" type="submit">Salvează produsul</button></div>
    </form>
  );
}
