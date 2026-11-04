import { AdminFlash } from "@/components/AdminFlash";
import { AdminProductForm } from "@/components/AdminProductForm";
import { requireAdmin } from "@/server/adminAuth";

export const metadata = { title: "Produs nou" };

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireAdmin();
  const { m } = await searchParams;
  return (<><h1>Produs nou</h1><AdminFlash code={m} /><AdminProductForm /></>);
}
