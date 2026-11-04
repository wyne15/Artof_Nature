import "server-only";
import { BUSINESS } from "@/config/site";
import { escapeHtml as h } from "@/lib/escape";
import { formatDate } from "@/lib/logistics";
import { formatGBP, type Locale } from "@/lib/money";
import { env } from "./env";

type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string; headers?: Record<string, string> };

/** Plain-fetch Resend client. In local dev without a key the email is printed instead of sent. */
export async function sendEmail(m: Mail): Promise<boolean> {
  if (!env.resendKey) {
    if (env.isProd) {
      console.error("RESEND_API_KEY missing: email not sent");
      return false;
    }
    console.log(`\n[email:dev] to=${m.to}\nsubject=${m.subject}\n${m.text}\n`);
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
        reply_to: m.replyTo,
        headers: m.headers,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("resend", res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error("resend failed", e instanceof Error ? e.message : e);
    return false;
  }
}

/* ───────────── layout ───────────── */
function wrap(lang: Locale, title: string, bodyHtml: string, opts: { marketing?: { unsubscribeUrl: string } } = {}): string {
  const foot =
    lang === "ro"
      ? `${h(BUSINESS.brand)} · ${h(BUSINESS.address)}`
      : `${h(BUSINESS.brand)} · ${h(BUSINESS.address)}`;
  const unsub = opts.marketing
    ? `<p style="margin:12px 0 0"><a href="${h(opts.marketing.unsubscribeUrl)}" style="color:#6B6650">${lang === "ro" ? "Dezabonare" : "Unsubscribe"}</a></p>`
    : "";
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#F7F3EB;font-family:Arial,Helvetica,sans-serif;color:#2A2615">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFDF8;border-radius:12px;overflow:hidden">
<tr><td style="background:#2F3817;color:#F7F3EB;padding:20px 28px;font-size:22px;font-family:Georgia,serif">${h(BUSINESS.brand)}</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6"><h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 14px;color:#2F3817">${h(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px 24px;font-size:12px;color:#6B6650;border-top:1px solid #eee">${foot}${unsub}</td></tr>
</table></td></tr></table></body></html>`;
}
const btn = (url: string, label: string) =>
  `<p style="margin:22px 0"><a href="${h(url)}" style="background:#5C6B2E;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;display:inline-block;font-weight:600">${h(label)}</a></p><p style="font-size:13px;color:#6B6650">${h(url)}</p>`;

/* ───────────── customer emails ───────────── */
export function confirmAccountEmail(to: string, firstName: string, url: string, lang: Locale): Mail {
  const ro = lang === "ro";
  const subject = ro ? "Confirmă-ți adresa de email" : "Confirm your email address";
  const intro = ro ? `Bună ${firstName}, mulțumim că ți-ai creat un cont. Confirmă adresa de email ca să-l activezi.` : `Hi ${firstName}, thanks for creating an account. Please confirm your email address to activate it.`;
  const note = ro ? "Linkul este valabil 24 de ore. Dacă nu ai creat tu contul, ignoră acest mesaj." : "The link is valid for 24 hours. If you didn't create this account, ignore this email.";
  return { to, subject, html: wrap(lang, subject, `<p>${h(intro)}</p>${btn(url, ro ? "Confirmă emailul" : "Confirm email")}<p>${h(note)}</p>`), text: `${intro}\n\n${url}\n\n${note}` };
}

export function resetPasswordEmail(to: string, url: string, lang: Locale): Mail {
  const ro = lang === "ro";
  const subject = ro ? "Resetează-ți parola" : "Reset your password";
  const intro = ro ? "Am primit o cerere de resetare a parolei. Folosește butonul de mai jos ca să alegi una nouă." : "We received a request to reset your password. Use the button below to choose a new one.";
  const note = ro ? "Dacă nu ai cerut tu asta, ignoră acest mesaj: parola ta nu se schimbă." : "If you didn't ask for this, ignore this email: your password stays the same.";
  return { to, subject, html: wrap(lang, subject, `<p>${h(intro)}</p>${btn(url, ro ? "Alege o parolă nouă" : "Choose a new password")}<p>${h(note)}</p>`), text: `${intro}\n\n${url}\n\n${note}` };
}

export function newsletterConfirmEmail(to: string, url: string, lang: Locale): Mail {
  const ro = lang === "ro";
  const subject = ro ? "Confirmă abonarea la noutăți" : "Confirm your subscription";
  const intro = ro ? "Mai e un singur pas: confirmă că vrei să primești emailuri de la Art of Nature despre loturile noi." : "One last step: confirm you'd like to receive emails from Art of Nature about new batches.";
  const note = ro ? "Dacă nu te-ai abonat tu, ignoră acest mesaj și nu vei primi nimic." : "If you didn't sign up, ignore this email and you won't hear from us.";
  return { to, subject, html: wrap(lang, subject, `<p>${h(intro)}</p>${btn(url, ro ? "Confirmă abonarea" : "Confirm subscription")}<p>${h(note)}</p>`), text: `${intro}\n\n${url}\n\n${note}` };
}

export type MailOrder = {
  number: number;
  email: string;
  name: string;
  lang: Locale;
  items: { name: string; qty: number; unitPence: number }[];
  subtotalPence: number;
  shippingPence: number;
  totalPence: number;
  address: string[];
  dispatchEarliest?: string;
  dispatchLatest?: string;
  tracking?: string | null;
};

function itemsTable(o: MailOrder): string {
  const rows = o.items
    .map((i) => `<tr><td style="padding:6px 0">${h(i.name)} × ${i.qty}</td><td align="right" style="padding:6px 0">${h(formatGBP(i.unitPence * i.qty, o.lang))}</td></tr>`)
    .join("");
  const ro = o.lang === "ro";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;margin:14px 0">${rows}
<tr><td style="padding:6px 0;color:#6B6650">${ro ? "Livrare" : "Delivery"}</td><td align="right">${h(o.shippingPence === 0 ? (ro ? "Gratuită" : "Free") : formatGBP(o.shippingPence, o.lang))}</td></tr>
<tr><td style="padding:8px 0"><b>Total</b></td><td align="right"><b>${h(formatGBP(o.totalPence, o.lang))}</b></td></tr></table>`;
}

export function orderConfirmationEmail(o: MailOrder): Mail {
  const ro = o.lang === "ro";
  const ref = `AON-${o.number}`;
  const subject = ro ? `Comanda ta ${ref} a fost primită` : `Your order ${ref} is confirmed`;
  const when =
    o.dispatchEarliest && o.dispatchLatest
      ? ro
        ? `Pregătesc fiecare comandă manual. O voi expedia între ${formatDate(o.dispatchEarliest, "ro")} și ${formatDate(o.dispatchLatest, "ro")} și îți trimit un email cu numărul de urmărire.`
        : `Every order is made by hand. I'll post yours between ${formatDate(o.dispatchEarliest, "en")} and ${formatDate(o.dispatchLatest, "en")} and email you a tracking number.`
      : "";
  const intro = ro ? `Mulțumim, ${o.name}! Am primit plata.` : `Thank you, ${o.name}! We have received your payment.`;
  const ret = ro ? "Poți returna produsele în 14 zile de la primire. Costul returului este suportat de client (cu excepția produselor defecte sau greșite). Vezi pagina Retur pe site." : "You can return items within 14 days of receiving them. The customer pays return postage (except faulty or wrong items). See the Returns page on our website.";
  const body = `<p>${h(intro)}</p><p><b>${h(ref)}</b></p>${itemsTable(o)}<p>${h(when)}</p><p style="color:#6B6650">${ro ? "Adresa de livrare" : "Delivery address"}:<br>${o.address.map(h).join("<br>")}</p><p style="font-size:13px;color:#6B6650">${h(ret)}</p>`;
  const text = `${intro}\n${ref}\n\n${o.items.map((i) => `${i.name} x${i.qty}  ${formatGBP(i.unitPence * i.qty, o.lang)}`).join("\n")}\nTotal ${formatGBP(o.totalPence, o.lang)}\n\n${when}\n\n${ret}`;
  return { to: o.email, subject, html: wrap(o.lang, subject, body), text };
}

export function trackingEmail(o: Pick<MailOrder, "number" | "email" | "name" | "lang">, tracking: string | null): Mail {
  const ro = o.lang === "ro";
  const ref = `AON-${o.number}`;
  const subject = ro ? `Comanda ${ref} a fost expediată` : `Your order ${ref} has been posted`;
  const intro = ro ? `Vești bune, ${o.name}: comanda ta este pe drum.` : `Good news, ${o.name}: your order is on its way.`;
  const trk = ro ? "Număr de urmărire" : "Tracking number";
  const trkHtml = tracking ? `<p>${h(trk)}: <b>${h(tracking)}</b></p>` : "";
  const body = `<p>${h(intro)}</p>${trkHtml}<p>${ro ? "Livrarea durează de obicei 1–3 zile lucrătoare de la expediere." : "Delivery usually takes 1–3 working days after posting."}</p>`;
  return { to: o.email, subject, html: wrap(o.lang, subject, body), text: `${intro}${tracking ? `\n${trk}: ${tracking}` : ""}` };
}

/* ───────────── owner emails (Romanian) ───────────── */
export function ownerNewOrderEmail(o: MailOrder, flag: string): Mail {
  const ref = `AON-${o.number}`;
  const subject = `Comandă nouă ${ref} – ${formatGBP(o.totalPence, "ro")}`;
  const body = `<p>Ai o comandă nouă de la <b>${h(o.name)}</b> (${h(o.email)}).</p>${itemsTable({ ...o, lang: "ro" })}<p>Adresă:<br>${o.address.map(h).join("<br>")}</p>${o.dispatchLatest ? `<p>De expediat până la: <b>${h(formatDate(o.dispatchLatest, "ro"))}</b></p>` : ""}${flag ? `<p style="color:#9a3412"><b>Atenție:</b> ${h(flag)}</p>` : ""}<p><a href="${h(env.siteUrl)}/admin/orders">Deschide administrarea</a></p>`;
  return { to: env.ownerEmail, subject, html: wrap("ro", subject, body), text: `Comandă nouă ${ref} de la ${o.name}. Total ${formatGBP(o.totalPence, "ro")}. ${flag}` };
}

export function ownerContactEmail(m: { name: string; email: string; topic: string; message: string }): Mail {
  const subject = `Mesaj nou de la ${m.name}`;
  const body = `<p><b>${h(m.name)}</b> (${h(m.email)}) – ${h(m.topic)}</p><p style="white-space:pre-wrap">${h(m.message)}</p>`;
  return { to: env.ownerEmail, subject, html: wrap("ro", subject, body), text: `${m.name} <${m.email}> (${m.topic})\n\n${m.message}`, replyTo: m.email };
}
