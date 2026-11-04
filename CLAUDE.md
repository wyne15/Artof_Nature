@AGENTS.md

## Despre acest proiect
- Magazin bilingv (EN/RO) „The Art of Nature”: Next.js 16 App Router, Supabase, Stripe, Resend.
- Toate datele trec prin server (cheia secretă Supabase); browserul nu vorbește niciodată direct cu baza de date.
- Prețurile se recalculează mereu pe server (`src/app/api/checkout/route.ts`). Nu te baza niciodată pe prețuri trimise de client.
- Comanda devine „plătită” doar prin webhook-ul Stripe semnat (`src/app/api/webhook/stripe/route.ts` + funcția SQL `fulfil_order`).
- Textele vizibile stau în `src/i18n/en.ts` și `src/i18n/ro.ts` (testul `tests/i18n.test.ts` cere structură identică).
- Programul și termenele de livrare: `src/lib/logistics.ts` (testat în `tests/logistics.test.ts`).
- Rulează `npm run typecheck && npm test` după orice modificare.
