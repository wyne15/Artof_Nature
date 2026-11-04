/** fmt("Hello {name}", { name: "Ana" }) → "Hello Ana". Unknown placeholders are left as they are. Safe for client and server. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
