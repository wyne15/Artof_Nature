import { imageUrl } from "@/lib/variants";
import Link from "next/link";
import { AdminFlash } from "@/components/AdminFlash";
import { Svg } from "@/components/Svg";
import { productArt } from "@/lib/art";
import { requireAdmin } from "@/server/adminAuth";
import { listProducts } from "@/server/catalog";
import { quickProductAction } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produse" };

export default async function Products({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireAdmin();
  const { m } = await searchParams;
  const products = await listProducts({ includeInactive: true });
  return (
    <>
      <div className="ahead"><h1>Produse</h1><Link className="btn btn-olive sm" href="/admin/products/new">Adaugă produs</Link></div>
      <AdminFlash code={m} />
      <p className="sub2">Prețul se verifică din nou pe server la plată, deci nu poate fi modificat din browser. Stocul scade automat când o plată reușește.</p>
      <div className="list">
        {products.map((p) => (
          <form action={quickProductAction} className="li prow" key={p.id}>
            <input type="hidden" name="id" value={p.id} />
            <div className="pn">
              <div className="pth">{p.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", p.images[0])} alt="" width={48} height={60} />
              ) : (
                <Svg html={productArt({ name: p.nameRo, category: p.category, artKind: p.artKind, artColor: p.artColor, artWax: p.artWax }, 0)} />
              )}</div>
              <div><b>{p.nameRo}</b><small>{p.category}{p.stock <= 5 ? <> · <span className="lowt">stoc redus</span></> : null}{!p.active ? " · ascuns" : ""}</small></div>
            </div>
            <label className="mini">Preț £<input type="text" inputMode="decimal" name="price" defaultValue={(p.pricePence / 100).toFixed(2)} style={{ width: 84, minHeight: 44, border: "1.5px solid rgba(42,38,21,.28)", borderRadius: 10, padding: "0 10px" }} /></label>
            <label className="mini">Stoc<input type="number" name="stock" min={0} step={1} defaultValue={p.stock} /></label>
            <label className="mini tg"><input type="checkbox" name="active" defaultChecked={p.active} /><span>Se vinde</span></label>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-line sm" type="submit">Salvează</button>
              <Link className="btn btn-line sm" href={`/admin/products/${p.id}`}>Editează textele</Link>
            </div>
          </form>
        ))}
      </div>
    </>
  );
}
