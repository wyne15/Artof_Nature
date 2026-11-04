# Securitate și GDPR – ce este implementat

Scopul: un magazin care nu poate fi folosit pentru a-ți fura datele sau banii și care respectă UK GDPR.
Nimeni nu poate promite „imposibil de spart”; mai jos e exact ce este făcut, ce rămâne în sarcina ta și ce riscuri au rămas.

## Date și baza de date
- **Browserul nu vorbește niciodată cu baza de date.** Toate tabelele au Row Level Security pornit, fără nicio politică pentru public, iar drepturile pentru rolurile `anon`/`authenticated` sunt retrase. Doar serverul (cheia secretă) are acces.
- Parolele sunt gestionate de Supabase Auth (hash bcrypt). Noi nu le vedem și nu le stocăm.
- Adresele IP **nu se salvează**; se păstrează doar o amprentă (hash cu sare secretă) pentru limitarea abuzurilor.
- Cardurile: Stripe. Noi nu vedem și nu stocăm numere de card.

## Bani
- Prețurile vin **doar din baza de date**, recalculate pe server la fiecare plată. Clientul trimite doar produsul și cantitatea.
- Comanda devine „plătită” **doar** prin webhook-ul Stripe, cu semnătură verificată. Evenimentul și schimbarea comenzii se salvează într-o singură tranzacție SQL (fără dubluri, fără comenzi pierdute la reîncercări).
- Stocul scade atomic; dacă doi clienți cumpără ultimul produs, comanda a doua este marcată „necesită atenție”.
- Livrare doar în UK (Stripe refuză alte țări).

## Conturi și sesiuni
- Confirmare email obligatorie; linkurile din email deschid o pagină cu buton (scanerele de email nu pot „consuma” linkul).
- Parolă: minim 10 caractere, listă de parole comune, fără numele din email.
- Sesiune: cookie `httpOnly`, `Secure`, `SameSite=Lax`, prefix `__Host-` în producție, semnat HMAC; poate fi anulat de pe server (schimbarea parolei te deconectează de peste tot).
- Răspunsuri identice pentru „cont existent / inexistent” la înregistrare, login și resetare (nu se pot afla ce emailuri au cont).
- Limitare de încercări (în baza de date, pe IP și pe email) la login, înregistrare, resetare, contact, newsletter, plată.

## Admin
- Acces doar pentru `OWNER_EMAIL`: **parolă (Supabase) + cod TOTP** din aplicație; un cod nu poate fi folosit de două ori.
- Sesiune `SameSite=Strict`, 30 de minute de inactivitate, maximum 8 ore; fiecare acțiune re-verifică sesiunea.
- Pagini `noindex`, `no-store`; jurnal de audit pentru acțiuni (păstrat 90 de zile).
- Exporturile CSV neutralizează formulele (`=`, `+`, `-`, `@`).

## Browser și rețea
- HTTPS forțat (HSTS 2 ani, preload).
- **Content-Security-Policy cu nonce** pe fiecare cerere: doar scripturile site-ului pot rula; nu există `unsafe-inline`/`unsafe-eval` pentru scripturi.
- Protecție CSRF: orice cerere care modifică date și vine de pe alt site este respinsă (verificare `Origin`).
- `X-Frame-Options: DENY`, `frame-ancestors 'none'` (fără clickjacking), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP.
- Toate intrările sunt validate cu scheme stricte (zod); emailurile și HTML-ul sunt escapate; JSON-LD nu poate închide eticheta script.

## GDPR (UK GDPR / Data Protection Act 2018)
| Cerință | Cum este acoperită |
|---|---|
| Transparență | Politică de confidențialitate completă (operator, date, temei legal, destinatari, transferuri, retenție, drepturi, ICO) în EN și RO |
| Consimțământ | Casete nebifate; mesaj de contact cu consimțământ; **newsletter cu dublă confirmare** (se păstrează versiunea politicii și data) |
| Fără urmărire | Nu există analytics, pixeli, reclame sau cookie-uri de marketing → **nu e nevoie de banner de cookie-uri**. Dacă adaugi analytics, trebuie banner cu acord prealabil |
| Acces / portabilitate | Cont → Confidențialitate → „Descarcă datele mele” (JSON) |
| Ștergere | Cont → „Șterge contul” (cu parolă). Comenzile se păstrează 6 ani (obligație fiscală), separate de cont |
| Rectificare | Cont → Date / Adresă |
| Retragerea acordului | Link de dezabonare; bifă în cont |
| Termen de o lună | Admin → Cereri GDPR, cu zile rămase |
| Minimizare / retenție | Doar datele necesare; mesaje de contact 2 ani, jurnale 90 de zile, comenzi 6 ani; curățare automată |
| Securitate | Vezi mai sus |

## Ce rămâne în sarcina ta
1. Verificarea juridică a textelor și completarea datelor firmei.
2. Autentificare în doi pași pe toate conturile de servicii; parole unice.
3. Păstrarea cheilor secrete **doar** în variabilele din Vercel (niciodată în email, chat sau Git). Dacă o cheie a fost văzută de cineva, o regenerezi imediat.
4. Actualizări lunare ale dependențelor.
5. Răspuns la cererile GDPR în maximum o lună; anunț către ICO în 72 de ore la o încălcare a securității.

## Riscuri rămase (le știi, nu sunt ascunse)
- `style-src 'unsafe-inline'`: stilurile inline sunt permise (necesare pentru ilustrațiile SVG). Scripturile rămân blocate, iar riscul real (XSS) este acoperit.
- Supabase permite înregistrări directe prin API cu cheia publică; efectul este doar conturi neconfirmate. Parola și limitele noastre se aplică prin formular, nu prin apelul direct.
- Codul nu a trecut printr-un test de penetrare extern. Pentru volum mare, merită unul.
- În mediul în care a fost scris codul nu s-a putut rula `next build` (fără acces la rețea); rulează `npm run build` local înainte de publicare.
