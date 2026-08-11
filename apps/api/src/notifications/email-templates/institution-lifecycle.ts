import { renderEmailLayout, L, type EmailLocale } from './layout';

/** Sent to an institution's Academic Head when their KYC packet is approved
 *  — either by Super Admin's manual "Verify KYC" action or Razorpay's
 *  account.activated/instantly_activated webhook. */
export function kycVerifiedEmail(locale: EmailLocale, orgName: string, settlementsUrl: string) {
  const heading = L(locale, 'KYC सत्यापित — भुगतान सक्षम', 'KYC verified — payouts enabled');
  const subject = L(locale, 'RajyaRank: आपकी KYC सत्यापित हो गई है', 'RajyaRank: Your KYC has been verified');
  const bodyHtml = `<p style="margin:0;">${L(
    locale,
    `${orgName} के लिए KYC सत्यापन पूरा हो गया है। अब आप छात्र बिक्री से भुगतान प्राप्त कर सकते हैं।`,
    `KYC verification for ${orgName} is complete. You can now receive payouts from student sales.`,
  )}</p>`;
  const html = renderEmailLayout({
    locale,
    heading,
    bodyHtml,
    preheader: heading,
    cta: { label: L(locale, 'भुगतान देखें', 'View earnings'), href: settlementsUrl },
  });
  return { subject, html };
}

/** Sent to an institution's Academic Head when their KYC packet is rejected
 *  — either by Super Admin's manual "Reject KYC" action (with a reason) or
 *  Razorpay's account.rejected/suspended webhook (generic reason). */
export function kycRejectedEmail(locale: EmailLocale, orgName: string, reason: string, settlementsUrl: string) {
  const heading = L(locale, 'KYC अस्वीकृत', 'KYC rejected');
  const subject = L(locale, 'RajyaRank: आपकी KYC समीक्षा में अस्वीकृत हुई', 'RajyaRank: Your KYC submission was rejected');
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(
      locale,
      `${orgName} के लिए प्रस्तुत KYC की समीक्षा की गई और उसे अस्वीकृत कर दिया गया है।`,
      `The KYC submitted for ${orgName} has been reviewed and rejected.`,
    )}</p>
    <p style="margin:0;color:#64748B;">${L(locale, 'कारण', 'Reason')}: ${reason}</p>
  `;
  const html = renderEmailLayout({
    locale,
    heading,
    bodyHtml,
    preheader: heading,
    cta: { label: L(locale, 'फिर से जमा करें', 'Resubmit KYC'), href: settlementsUrl },
  });
  return { subject, html };
}
