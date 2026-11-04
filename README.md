# The Art of Nature – magazin online

Lumânări și produse de îngrijire din ceară de albine din Moldova, turnate manual în Anglia.
Site bilingv (**English / Română**), conturi pentru clienți, panou de administrare, plăți Stripe, livrare doar în UK.

> **Ce trebuie să știi înainte de orice:** cât timp nu ai completat datele firmei și nu ai verificat paginile legale,
> site-ul nu este gata de lansare. Vezi `docs/LANSARE.md` (lista completă, bifabilă).

## Ce face

| Zonă | Ce include |
|---|---|
| Magazin | pagini separate pe limbă (`/en`, `/ro`), produse cu pagini proprii, coș, plată Stripe (doar UK), animația cu albina (o dată pe sesiune, se poate sări) |
| Clienți | cont cu confirmare prin email, parolă cu reguli moderne, resetare parolă, comenzi, adresă, **descărcare date și ștergere cont** (GDPR) |
| Tu (admin, în română) | `/admin`: de ambalat (grupat pe zile), comenzi cu număr de urmărire + email automat, produse și stoc, mesaje, cereri GDPR cu termen, **program și vacanțe** |
| Logistică | tu lucrezi singură, 9–14, luni–vineri; comanda durează 2–4 zile lucrătoare; limită de comenzi pe zi; vacanțele copilului mută automat datele promise sau opresc plata |
| SEO | HTML randat pe server, hreflang EN/RO, canonical, sitemap, robots, date structurate (Organization, Product, FAQ, BreadcrumbList), fără recenzii inventate |
| Securitate / GDPR | vezi `docs/SECURITATE-GDPR.md` |

## Pornire pe calculatorul tău

```bash
npm install
cp .env.example .env.local      # completează valorile (vezi mai jos)
npm run dev                     # http://localhost:3000
```

Fără Supabase configurat, site-ul pornește local cu cele 10 produse de probă (doar pentru previzualizare; plata, conturile și adminul au nevoie de Supabase).

Comenzi utile: `npm run typecheck` · `npm test` · `npm run build` · `npm run seed:sql` (regenerează `supabase/seed.sql`).

## Configurare, pas cu pas

### 1. Supabase (baza de date și conturile)
1. Creează un proiect la supabase.com. Alege regiunea **London** (cea mai apropiată de clienții din UK).
2. **SQL Editor** → rulează tot conținutul `supabase/schema.sql`, apoi `supabase/seed.sql`.
3. **Project Settings → API**: copiază *Project URL*, *publishable key* și *secret key* în `.env.local`.
   Cheia **secretă** nu se pune niciodată într-un fișier public și nu începe cu `NEXT_PUBLIC_`.
4. **Authentication → Providers → Email**: lasă „Confirm email” **pornit**.

### 2. Cod pentru autentificarea în doi pași (admin)
```bash
npm run totp:setup -- emailul-tau@exemplu.com
```
Copiază `ADMIN_TOTP_SECRET`, `APP_SECRET`, `ADMIN_SESSION_SECRET`, `IP_HASH_SALT` în `.env.local`.
În Google Authenticator / Microsoft Authenticator alege „Introdu o cheie de configurare” și lipește `ADMIN_TOTP_SECRET`.

### 3. Contul tău de proprietar
Setează `OWNER_EMAIL` la emailul tău, apoi creează un cont normal pe site cu acel email (`/en/account`), confirmă emailul.
La `/admin/login` intri cu **acel email + parola contului + codul de 6 cifre** din aplicație. Nimeni altcineva nu poate intra, chiar dacă își face cont.

### 4. Stripe (plăți)
1. Cont Stripe → *Developers → API keys* → `STRIPE_SECRET_KEY` (începe cu testul `sk_test_…`).
2. *Developers → Webhooks → Add endpoint*: `https://DOMENIUL-TĂU/api/webhook/stripe`, evenimente: `checkout.session.completed` și `checkout.session.expired`. Copiază *Signing secret* în `STRIPE_WEBHOOK_SECRET`.
3. Local: `stripe listen --forward-to localhost:3000/api/webhook/stripe`.
4. Testează cu cardul `4242 4242 4242 4242`. Treci pe cheile *live* doar la lansare.

### 5. Emailuri (Resend)
Cont resend.com → adaugă și verifică domeniul (înregistrările DNS SPF/DKIM) → `RESEND_API_KEY` și `EMAIL_FROM="The Art of Nature <comenzi@domeniul-tau.co.uk>"`.
Fără cheie, în dezvoltare emailurile se afișează în terminal; în producție nu se trimit (adminul te avertizează).

### 6. Publicare (Vercel)
Importă proiectul în Vercel, adaugă **aceleași variabile** din `.env.example` (cu `NEXT_PUBLIC_SITE_URL=https://domeniul-tau.co.uk`), conectează domeniul. HTTPS este automat.

## Prima zi de lucru în admin
1. **Setări și program**: pune **prețul real al livrării** (acum e provizoriu £3.99), pragul de livrare gratuită (£40), orele tale și vacanțele copilului (tip „primește comenzi”).
2. **Produse**: pune stocul real și prețurile reale.
3. Completează `src/config/site.ts` (numele tău/firma, adresa din UK, numărul ICO).

## Cum merge o comandă
1. Clientul alege produse → serverul recalculează prețurile din baza de date și verifică stocul → Stripe Checkout (doar adrese UK).
2. Stripe confirmă plata prin webhook semnat → comanda devine „plătită”, stocul scade, primește număr (AON-1001…) și o dată promisă de expediere.
3. Clientul primește emailul de confirmare cu intervalul de expediere; tu primești email cu comanda.
4. În **De ambalat** vezi comenzile pe zile. Când postezi pachetul: scrii numărul de urmărire (opțional) → „Expediat + trimite email”.
5. Rambursare: o faci în Stripe, apoi schimbi statusul în admin.

## Structura proiectului
```
src/app/(site)/[lang]/   paginile publice (en/ro)
src/app/(admin)/admin/   administrarea (română) + acțiunile de pe server
src/app/api/             checkout, webhook Stripe, auth, cont, contact, newsletter
src/proxy.ts             limbă + CSP cu nonce + protecție CSRF
src/server/              cod doar-pe-server (baza de date, sesiuni, emailuri)
src/lib/                 logică pură, testată (program, bani, TOTP, validări)
src/i18n/                texte EN/RO (aceeași structură, verificată de test)
supabase/schema.sql      tabele, securitate la nivel de rând, funcții
tests/                   teste automate
docs/                    lansare, securitate+GDPR, SEO
```

## Verificare înainte de a publica
```bash
npm run typecheck && npm test && npm run build
```
