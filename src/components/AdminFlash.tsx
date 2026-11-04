const MESSAGES: Record<string, { text: string; bad?: boolean }> = {
  saved: { text: "Salvat." },
  status: { text: "Statusul comenzii a fost schimbat." },
  dispatched: { text: "Comanda este marcată ca expediată și clientul a primit emailul." },
  dispatched_noemail: { text: "Comanda este marcată ca expediată, dar emailul către client NU a putut fi trimis. Scrie-i tu.", bad: true },
  flag: { text: "Avertismentul a fost șters." },
  tracking: { text: "Numărul de urmărire nu este valid (8–30 litere sau cifre). Poți lăsa câmpul gol.", bad: true },
  invalid: { text: "Unele câmpuri nu sunt corecte. Verifică și încearcă din nou.", bad: true },
  slug_taken: { text: "Adresa (slug) este deja folosită de alt produs.", bad: true },
  err: { text: "Ceva nu a mers. Încearcă din nou.", bad: true },
};

export function AdminFlash({ code }: { code?: string }) {
  const m = code ? MESSAGES[code] : undefined;
  if (!m) return null;
  return <div className={m.bad ? "draft" : "flash"} role="status">{m.text}</div>;
}
