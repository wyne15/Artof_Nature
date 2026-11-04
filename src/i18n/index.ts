import { en, type Dict } from "./en";
import { ro } from "./ro";
import type { Locale } from "@/lib/money";

export type { Dict };
export const LOCALES = ["en", "ro"] as const;

export function isLocale(v: string): v is Locale {
  return v === "en" || v === "ro";
}

export function getDict(lang: Locale): Dict {
  return lang === "ro" ? ro : en;
}

export { fmt } from "./fmt";
