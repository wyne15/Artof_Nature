import type { Metadata, Viewport } from "next";
import { fonts } from "@/lib/fontset";
import "../../globals.css";

export const metadata: Metadata = {
  title: { default: "Administrare | Art of Nature", template: "%s | Administrare" },
  robots: { index: false, follow: false, nocache: true, noarchive: true },
  referrer: "no-referrer",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={fonts}>
      <body className="adm">{children}</body>
    </html>
  );
}
