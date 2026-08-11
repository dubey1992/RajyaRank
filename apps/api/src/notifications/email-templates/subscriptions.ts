import { renderEmailLayout, L, type EmailLocale } from './layout';

/** Sent to an institution's Academic Head right after a self-serve purchase
 *  is confirmed (Checkout success callback or the subscription.charged
 *  webhook, whichever lands first — see billing.service.ts's
 *  activateChargedSubscription). */
export function subscriptionActivatedEmail(locale: EmailLocale, orgName: string, planNameHi: string, planNameEn: string, billingUrl: string) {
  const planName = L(locale, planNameHi, planNameEn);
  const heading = L(locale, 'सदस्यता सक्रिय', 'Subscription activated');
  const subject = L(locale, `RajyaRank: ${planName} योजना सक्रिय हो गई`, `RajyaRank: Your ${planName} plan is now active`);
  const bodyHtml = `<p style="margin:0;">${L(
    locale,
    `${orgName} के लिए <strong>${planName}</strong> योजना अब सक्रिय है। भुगतान की पुष्टि हो गई है।`,
    `The <strong>${planName}</strong> plan for ${orgName} is now active. Payment has been confirmed.`,
  )}</p>`;
  const html = renderEmailLayout({
    locale,
    heading,
    bodyHtml,
    preheader: heading,
    cta: { label: L(locale, 'बिलिंग देखें', 'View billing'), href: billingUrl },
  });
  return { subject, html };
}

/** Sent when a subscription lapses from ACTIVE to PAST_DUE — Razorpay's
 *  subscription.pending/subscription.halted webhook, meaning a renewal
 *  charge failed and the institute has lost access. Not sent for a Super
 *  Admin's deliberate manual cancellation (that's a different, intentional
 *  action, not a payment failure). */
export function subscriptionExpiredEmail(locale: EmailLocale, orgName: string, planNameHi: string, planNameEn: string, billingUrl: string) {
  const planName = L(locale, planNameHi, planNameEn);
  const heading = L(locale, 'सदस्यता समाप्त हो गई', 'Subscription expired');
  const subject = L(locale, 'RajyaRank: आपकी सदस्यता समाप्त हो गई है', 'RajyaRank: Your subscription has expired');
  const bodyHtml = `<p style="margin:0;">${L(
    locale,
    `${orgName} के लिए <strong>${planName}</strong> योजना का नवीनीकरण भुगतान विफल रहा और सदस्यता अब सक्रिय नहीं है। छात्र जोड़ने, स्टाफ़ प्रबंधित करने और अन्य सुविधाएं अस्थायी रूप से रुक गई हैं।`,
    `The renewal payment for the <strong>${planName}</strong> plan on ${orgName} failed and the subscription is no longer active. Adding students, managing staff, and other features are temporarily unavailable.`,
  )}</p>`;
  const html = renderEmailLayout({
    locale,
    heading,
    bodyHtml,
    preheader: heading,
    cta: { label: L(locale, 'अभी नवीनीकृत करें', 'Renew now'), href: billingUrl },
  });
  return { subject, html };
}
