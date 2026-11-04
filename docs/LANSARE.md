# Lista de lansare

Bifează fiecare punct înainte să primești prima comandă reală. Adminul (`/admin`, Prezentare) îți arată automat o parte din ele.

## 1. Datele firmei (obligatoriu prin lege)
- [ ] `src/config/site.ts`: numele tău legal sau denumirea comercială, **adresa geografică din UK**, emailul. Legea britanică cere aceste date pe site (și în emailurile comerciale).
- [ ] Ești înregistrată la HMRC ca persoană fizică independentă (sole trader) sau ai firmă? Fără asta nu poți vinde legal.
- [ ] **Taxa ICO (protecția datelor)**: fă testul de pe ico.org.uk („data protection fee self-assessment”). Mulți micro-comercianți plătesc o taxă mică anuală (în jur de 50 de lire; verifică suma actuală), unii sunt scutiți. Dacă ești scutită, pune `icoNumber: ""` în `src/config/site.ts` și linia dispare din politică.
- [ ] Ai dat de cont bancar separat pentru afacere (recomandat) și l-ai legat la Stripe.

## 2. Texte legale
- [ ] Pune un specialist (avocat sau un serviciu de politici pentru comerț online) să verifice paginile **Confidențialitate, Termeni, Retur, Livrare, Cookie-uri**. Sunt redactate corect pentru UK GDPR și Consumer Contracts Regulations, dar sunt ciorne.
- [ ] După verificare: `NEXT_PUBLIC_LEGAL_REVIEWED=true` (bannerul „text în lucru” dispare).
- [ ] Ai încheiat/acceptat acordurile de prelucrare a datelor (DPA) cu Stripe, Supabase, Resend, Vercel (se acceptă din panourile lor, durează un minut fiecare).
- [ ] **Returul este plătit de client** (cum ai decis) – dar pentru produse defecte sau greșite plătești tu transportul. Așa cere legea; textul de pe site spune exact asta.

## 3. Produsele (conformitate UK)
**Cosmetice (unguent, balsam de buze, unt de corp, balsam față):**
- [ ] Ai o *Persoană Responsabilă* în UK (poți fi tu).
- [ ] Raport de siguranță *CPSR* făcut de un evaluator calificat, pentru fiecare formulă.
- [ ] Notificare pe portalul guvernamental **SCPN** înainte de vânzare.
- [ ] Etichete cu lista de ingrediente (INCI), cantitate netă (g/ml), numele și adresa ta, lot, durata de viață după deschidere, avertismente.

**Lumânări:**
- [ ] Etichete cu avertismente de siguranță, cantitate netă (g), numele și adresa ta; dacă folosești parfumuri, verifică etichetarea CLP a alergenilor.
- [ ] Teste/evaluare de siguranță conform reglementărilor generale de siguranță a produselor.

**Altele:**
- [ ] Asigurare de răspundere pentru produse (în practică cerută de evaluatori și de multe marketplace-uri).
- [ ] Pune pe fiecare produs cantitatea netă (ex: „220 g”) în câmpul *Format* din admin.
- [ ] Afirmația „ceară din Moldova” trebuie să fie adevărată pentru fiecare lot (păstrează facturile furnizorului).

## 4. Conținut real
- [ ] **Fotografii reale** ale produselor (ilustrațiile sunt provizorii). Aceleași fotografii vor apărea în Google. Cere să le integrez când le ai.
- [ ] Prețuri și stoc reale în admin. Preț real de livrare în *Setări*.
- [ ] Nu pune recenzii sau „stele” inventate; după primele vânzări reale, cere recenzii pe Google/Trustpilot.

## 5. Testare completă (cu chei de test Stripe)
- [ ] Creezi cont → primești email → confirmi → te autentifici → schimbi adresa.
- [ ] „Am uitat parola” funcționează.
- [ ] Faci o comandă cu cardul `4242 4242 4242 4242`: apare în *De ambalat*, stocul scade, primești emailul, primești și tu emailul.
- [ ] Marchezi „Expediat” cu număr de urmărire → clientul primește emailul.
- [ ] Din cont: descarcă datele, șterge contul.
- [ ] Adaugi o vacanță în Setări → apare banda de anunț pe site, iar în coș data estimată se mută.
- [ ] Verifici pe telefon (iPhone Safari și Android Chrome) toate paginile în ambele limbi.
- [ ] `npm run typecheck && npm test && npm run build` fără erori.

## 6. Treci în producție
- [ ] Chei Stripe **live** + webhook live (altă cheie de semnare).
- [ ] Domeniu + `NEXT_PUBLIC_SITE_URL` corect (afectează sitemap, canonical, linkurile din emailuri).
- [ ] Domeniul de email verificat în Resend (SPF/DKIM) – altfel emailurile ajung în spam.
- [ ] Activează autentificarea în doi pași pe conturile **Supabase, Vercel, Stripe, Resend, domeniu, email**. Un site sigur cade dacă parola contului de găzduire e slabă.
- [ ] Supabase: planul Pro are copii de siguranță zilnice; pe planul gratuit nu ai. Pentru comenzi reale, ia Pro sau exportă săptămânal comenzile (admin → Prezentare → CSV).
- [ ] Facturi/evidență: păstrează comenzile 6 ani (site-ul o face), le descarci CSV pentru contabil.

## 7. După lansare
- [ ] Vezi `docs/SEO.md` (Search Console, Bing, Google Merchant Center, Pinterest).
- [ ] O dată pe lună: `npm outdated`, actualizează, rulează testele.
- [ ] Dacă se întâmplă o încălcare a securității datelor care ar putea afecta clienții: anunți ICO în **72 de ore** (ico.org.uk/report-a-breach).

## Poze și culori la produse (actualizare)
1. În Supabase → SQL Editor rulează o dată `supabase/migrations/002_images_colors.sql` (adaugă coloanele pentru poze/culori și bucket-ul `product-images`).
2. În admin → Produse → deschizi un produs → „Poze produs" (JPG/PNG, max 4 MB, metadatele ascunse se șterg automat) și „Culori disponibile" (nume română + engleză + culoare). Clientul poate alege doar culorile adăugate. Stocul rămâne unul singur pe produs.
3. Fără nicio culoare adăugată, produsul se comandă ca înainte.
