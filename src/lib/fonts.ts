import { Cormorant_Garamond, Figtree, Parisienne } from "next/font/google";

export const serif = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-serif",
});

export const sans = Figtree({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
});

export const script = Parisienne({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-script",
});
