"use client";

import { useRef, useState } from "react";
import { imageUrl, MAX_COLORS, MAX_IMAGES, type ProductColor } from "@/lib/variants";

const newId = () => "c" + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("");

const ERR: Record<string, string> = {
  unsupported_image: "Fișierul nu e o poză JPG sau PNG valabilă.",
  too_large: "Poza e prea mare (maximum 4 MB).",
  unauthorized: "Sesiunea a expirat. Intră din nou în administrare.",
  rate_limited: "Prea multe încărcări. Așteaptă puțin.",
  storage_error: "Poza nu s-a putut salva. Verifică în Supabase dacă a rulat fișierul 002_images_colors.sql.",
};

const summaryStyle = { cursor: "pointer", fontWeight: 600, padding: "6px 0" } as const;

/** Photos (upload, order, remove) and optional colours (one name, swatch) for one product. */
export function AdminProductMedia({ base, initialImages, initialColors }: { base: string; initialImages: string[]; initialColors: ProductColor[] }) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [colors, setColors] = useState<ProductColor[]>(initialColors);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setMsg("");
    const added: string[] = [];
    for (const f of Array.from(files)) {
      if (images.length + added.length >= MAX_IMAGES) {
        setMsg(`Maximum ${MAX_IMAGES} poze pe produs.`);
        break;
      }
      const fd = new FormData();
      fd.append("file", f);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean; path?: string; error?: string };
        if (res.ok && j.ok && j.path) added.push(j.path);
        else setMsg(`${f.name}: ${ERR[j.error ?? ""] ?? "Încărcarea a eșuat."}`);
      } catch {
        setMsg(`${f.name}: Încărcarea a eșuat.`);
      }
    }
    if (added.length) setImages((cur) => [...cur, ...added]);
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((cur) => {
      const j = i + d;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  const patchColor = (id: string, patch: Partial<ProductColor>) => setColors((cur) => cur.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  // One name is enough: the Romanian name follows the English one until it is edited on purpose.
  const setNameEn = (id: string, v: string) =>
    setColors((cur) => cur.map((c) => (c.id === id ? { ...c, nameEn: v, nameRo: c.nameRo === "" || c.nameRo === c.nameEn ? v : c.nameRo } : c)));

  return (
    <div className="stack">
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="colors" value={JSON.stringify(colors)} />

      <fieldset className="media-box">
        <legend>Poze</legend>
        <p className="hint">Prima poză este cea principală. JPG sau PNG, maximum 4 MB fiecare, până la {MAX_IMAGES}. Locația din poză se șterge automat.</p>
        {images.length > 0 && (
          <ul className="media-grid">
            {images.map((p, i) => (
              <li key={p} className="media-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(base, p)} alt={`Poza ${i + 1}`} width={120} height={150} />
                <span className="media-tag">{i === 0 ? "Principală" : `Poza ${i + 1}`}</span>
                <div className="media-btns">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Mută poza ${i + 1} înainte`}>←</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label={`Mută poza ${i + 1} înapoi`}>→</button>
                  <button type="button" onClick={() => setImages((cur) => cur.filter((x) => x !== p))} aria-label={`Șterge poza ${i + 1}`}>Șterge</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div>
          <label className="btn btn-olive media-add" style={{ display: "inline-block", padding: "14px 28px", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: busy || images.length >= MAX_IMAGES ? 0.5 : 1 }} aria-disabled={busy || images.length >= MAX_IMAGES}>
            {busy ? "Se încarcă…" : "+ Adaugă poze"}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" multiple hidden disabled={busy || images.length >= MAX_IMAGES} onChange={(e) => void upload(e.target.files)} />
          </label>
        </div>
        <div className="ferr" role="alert">{msg}</div>
        <p className="hint">Pozele se salvează în magazin abia când apeși „Salvează produsul".</p>
      </fieldset>

      <fieldset className="media-box">
        <legend>Culori (opțional)</legend>
        <details open={initialColors.length > 0}>
          <summary style={summaryStyle}>Produsul are mai multe culori?</summary>
          <p className="hint">Clientul alege doar dintre culorile de aici. Dacă nu adaugi nicio culoare, produsul se comandă fără alegere. Stocul rămâne unul singur pentru tot produsul.</p>
          {colors.map((c, i) => (
            <div className="color-row" key={c.id}>
              <input type="color" value={c.hex} onChange={(e) => patchColor(c.id, { hex: e.target.value.toUpperCase() })} aria-label={`Culoarea ${i + 1}`} />
              <input type="text" value={c.nameEn} onChange={(e) => setNameEn(c.id, e.target.value)} placeholder="Numele culorii, ex: Honey" maxLength={40} aria-label={`Numele culorii ${i + 1}`} />
              <input type="text" value={c.nameRo} onChange={(e) => patchColor(c.id, { nameRo: e.target.value })} placeholder="În română, ex: Miere" maxLength={40} aria-label={`Numele culorii ${i + 1} în română`} />
              <button type="button" onClick={() => setColors((cur) => cur.filter((x) => x.id !== c.id))} aria-label={`Șterge culoarea ${i + 1}`}>Șterge</button>
            </div>
          ))}
          <div>
            <button type="button" className="btn btn-ghost" disabled={colors.length >= MAX_COLORS} onClick={() => setColors((cur) => [...cur, { id: newId(), nameEn: "", nameRo: "", hex: "#C9993A" }])}>
              Adaugă o culoare
            </button>
          </div>
        </details>
      </fieldset>
    </div>
  );
}
