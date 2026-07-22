import { renderEmailLayout, L, type EmailLocale } from './layout';

function money(amountMinor: number, currency: string): string {
  const amount = (amountMinor / 100).toFixed(2);
  return currency === 'INR' ? `₹${amount}` : `${currency} ${amount}`;
}

export function paymentReceiptEmail(locale: EmailLocale, titleHi: string, titleEn: string, amountMinor: number, currency: string) {
  const heading = L(locale, 'भुगतान की पुष्टि', 'Payment successful');
  const subject = L(locale, 'आपकी RajyaRank ख़रीद की पुष्टि', 'Your RajyaRank purchase is confirmed');
  const productTitle = L(locale, titleHi, titleEn);
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(locale, `आपकी <strong>${productTitle}</strong> तक पहुंच अब सक्रिय है।`, `Your access to <strong>${productTitle}</strong> is now active.`)}</p>
    <p style="margin:0;color:#64748B;">${L(locale, 'भुगतान की गई राशि', 'Amount paid')}: <strong style="color:#0B2F4F;">${money(amountMinor, currency)}</strong></p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function refundProcessedEmail(locale: EmailLocale, amountMinor: number, currency: string, full: boolean) {
  const heading = L(locale, 'धनवापसी संसाधित हुई', 'Your refund has been processed');
  const subject = L(locale, 'RajyaRank धनवापसी संसाधित', 'Your RajyaRank refund has been processed');
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(locale, `आपकी <strong>${money(amountMinor, currency)}</strong> की धनवापसी संसाधित कर दी गई है। यह 5-7 कार्य दिवसों में आपके मूल भुगतान माध्यम में दिखाई देगी।`, `Your refund of <strong>${money(amountMinor, currency)}</strong> has been processed. It will appear on your original payment method within 5–7 business days.`)}</p>
    ${!full ? `<p style="margin:0;color:#64748B;">${L(locale, 'यह एक आंशिक धनवापसी है।', 'This is a partial refund.')}</p>` : ''}
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

/** Sent to every Super Admin when an Academic Head's refund request needs manual approval. */
export function refundRequestReceivedEmail(locale: EmailLocale, amountMinor: number, currency: string, buyer: string, productTitle: string) {
  const heading = L(locale, 'धनवापसी अनुरोध अनुमोदन हेतु लंबित', 'Refund request pending your approval');
  const subject = L(locale, 'RajyaRank धनवापसी अनुरोध — अनुमोदन आवश्यक', 'RajyaRank refund request needs your approval');
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(locale, `${buyer} द्वारा <strong>${productTitle}</strong> हेतु <strong>${money(amountMinor, currency)}</strong> की धनवापसी का अनुरोध किया गया है, जिसके लिए आपके अनुमोदन की आवश्यकता है।`, `A refund of <strong>${money(amountMinor, currency)}</strong> for <strong>${productTitle}</strong> (buyer: ${buyer}) has been requested and needs your approval.`)}</p>
    <p style="margin:0;color:#64748B;">${L(locale, 'इसे स्वीकृत या अस्वीकार करने के लिए एडमिन पैनल में धनवापसी प्रबंधन देखें।', 'Review it in Refund Management in the admin panel to approve or reject.')}</p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function refundApprovedEmail(locale: EmailLocale, amountMinor: number, currency: string) {
  const heading = L(locale, 'धनवापसी स्वीकृत', 'Your refund was approved');
  const subject = L(locale, 'RajyaRank धनवापसी स्वीकृत', 'Your RajyaRank refund was approved');
  const bodyHtml = `<p style="margin:0;">${L(locale, `आपकी <strong>${money(amountMinor, currency)}</strong> की धनवापसी स्वीकृत कर दी गई है और यह संसाधित हो रही है।`, `Your refund of <strong>${money(amountMinor, currency)}</strong> has been approved and is being processed.`)}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function refundRejectedEmail(locale: EmailLocale, reason?: string) {
  const heading = L(locale, 'धनवापसी अनुरोध अस्वीकृत', 'Your refund request was rejected');
  const subject = L(locale, 'RajyaRank धनवापसी अनुरोध अस्वीकृत', 'Your RajyaRank refund request was rejected');
  const bodyHtml = `
    <p style="margin:0 0 8px;">${L(locale, 'आपके धनवापसी अनुरोध की समीक्षा की गई और उसे अस्वीकृत कर दिया गया है।', 'Your refund request has been reviewed and rejected.')}</p>
    ${reason ? `<p style="margin:0;color:#64748B;">${L(locale, 'कारण', 'Reason')}: ${reason}</p>` : ''}
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

/** Sent to an institution's Academic Head with its invoice PDF attached —
 *  Super Admin's "Send" action on the Institute Billing screen. */
export function institutionInvoiceEmail(locale: EmailLocale, orgName: string, invoiceNumber: string, totalMinor: number, dueAt: Date) {
  const heading = L(locale, 'आपका RajyaRank चालान', 'Your RajyaRank invoice');
  const subject = L(locale, `RajyaRank चालान ${invoiceNumber}`, `Your RajyaRank invoice ${invoiceNumber}`);
  const due = dueAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(locale, `${orgName} के लिए चालान <strong>${invoiceNumber}</strong> इस ईमेल के साथ PDF के रूप में संलग्न है।`, `Invoice <strong>${invoiceNumber}</strong> for ${orgName} is attached to this email as a PDF.`)}</p>
    <p style="margin:0;color:#64748B;">${L(locale, 'कुल राशि', 'Total amount')}: <strong style="color:#0B2F4F;">${money(totalMinor, 'INR')}</strong> · ${L(locale, 'देय तिथि', 'Due')}: <strong style="color:#0B2F4F;">${due}</strong></p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}
