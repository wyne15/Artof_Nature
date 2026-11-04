/**
 * Business details shown on the site (footer, legal pages, JSON-LD).
 * UK law requires a trader's name, geographic address and email on the site.
 * Fill every "TODO" before launch. The admin overview warns while any is left.
 */
export const BUSINESS = {
  brand: "Art of Nature",
  legalName: "TODO: your full name or registered trading name",
  address: "TODO: your geographic address, UK",
  email: "hello@theartofnature.co.uk",
  icoNumber: "TODO: ICO registration number (ZA...)",
  // Not VAT registered => leave empty. Do not invent a number.
  vatNumber: "",
  countryOfMaking: "England, UK",
  waxOrigin: "",
} as const;

export const SITE = {
  defaultLocale: "en",
  locales: ["en", "ro"],
  currency: "GBP",
  /** Bump when privacy policy or terms change in a way that needs re-consent. */
  policyVersion: "2026-10",
} as const;

export function businessTodos(): string[] {
  const todos: string[] = [];
  for (const [k, v] of Object.entries(BUSINESS)) {
    if (typeof v === "string" && v.startsWith("TODO")) todos.push(k);
  }
  return todos;
}
