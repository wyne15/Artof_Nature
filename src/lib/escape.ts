export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Prevents CSV/spreadsheet formula injection when exporting user text. */
export function csvSafe(input: unknown): string {
  const s = String(input ?? "");
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/** Strips control characters and trims; used on all free-text input. */
export function cleanText(input: string, max: number): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}
