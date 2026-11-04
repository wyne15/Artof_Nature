import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminFlash } from "@/components/AdminFlash";
import { AdminProductForm } from "@/components/AdminProductForm";
import { requireAdmin } from "@/server/adminAuth";
import { listProducts } from "@/server/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editează produsul" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { m } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const p = (await listProducts({ includeInactive: true })).find((x) => x.id === id);
  if (!p) notFound();
  return (<><h1>{p.nameRo}</h1><AdminFlash code={m} /><AdminProductForm p={p} /></>);
}
