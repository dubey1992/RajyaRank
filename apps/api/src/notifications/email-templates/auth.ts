import { renderEmailLayout, L, type EmailLocale } from './layout';

export function otpCodeEmail(locale: EmailLocale, code: string, ttlMinutes: number) {
  const heading = L(locale, 'आपका सत्यापन कोड', 'Your verification code');
  const subject = L(locale, 'आपका RajyaRank सत्यापन कोड', 'Your RajyaRank verification code');
  const bodyHtml = `
    <p style="margin:0 0 16px;">${L(locale, 'अपना ईमेल सत्यापित करने के लिए यह कोड दर्ज करें:', 'Enter this code to verify your email:')}</p>
    <p style="margin:0 0 16px;text-align:center;"><span style="display:inline-block;padding:12px 20px;font-size:26px;font-weight:900;letter-spacing:6px;color:#0B2F4F;background:#F4F6F8;border-radius:8px;">${code}</span></p>
    <p style="margin:0;color:#64748B;">${L(locale, `यह कोड ${ttlMinutes} मिनट में समाप्त हो जाएगा।`, `This code expires in ${ttlMinutes} minutes.`)}</p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function studentAccountStatusChangedEmail(locale: EmailLocale, status: 'SUSPENDED' | 'ACTIVE') {
  const suspended = status === 'SUSPENDED';
  const heading = suspended ? L(locale, 'आपका खाता निलंबित कर दिया गया है', 'Your account has been suspended') : L(locale, 'आपका खाता पुनः सक्रिय कर दिया गया है', 'Your account has been reactivated');
  const subject = suspended ? L(locale, 'RajyaRank खाता निलंबित', 'Your RajyaRank account was suspended') : L(locale, 'RajyaRank खाता पुनः सक्रिय', 'Your RajyaRank account was reactivated');
  const bodyHtml = suspended
    ? `<p style="margin:0;">${L(locale, 'आपके संस्थान ने आपका खाता निलंबित कर दिया है और आपके सक्रिय सत्र समाप्त कर दिए गए हैं। अधिक जानकारी के लिए अपने संस्थान से संपर्क करें।', 'Your institution has suspended your account and signed out all of your active sessions. Contact your institution for details.')}</p>`
    : `<p style="margin:0;">${L(locale, 'आपका खाता पुनः सक्रिय कर दिया गया है — आप अब सामान्य रूप से लॉगिन कर सकते हैं।', 'Your account has been reactivated — you can now sign in as usual.')}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function studentForcedPasswordResetEmail(locale: EmailLocale, forgotPasswordUrl: string) {
  const heading = L(locale, 'पासवर्ड रीसेट आवश्यक', 'Password reset required');
  const subject = L(locale, 'RajyaRank पासवर्ड रीसेट आवश्यक', 'RajyaRank password reset required');
  const bodyHtml = `
    <p style="margin:0;">${L(locale, 'आपके संस्थान ने आपको अपना पासवर्ड रीसेट करने की आवश्यकता बताई है। जारी रखने के लिए "पासवर्ड भूल गए" का उपयोग करें।', 'Your institution has required you to reset your password. Use “Forgot password?” to continue.')}</p>
    <p style="margin:16px 0 0;color:#64748B;">${L(locale, 'आपके सभी सक्रिय सत्र समाप्त कर दिए गए हैं।', 'All of your active sessions have been signed out.')}</p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, cta: { label: L(locale, 'पासवर्ड रीसेट करें', 'Reset password'), href: forgotPasswordUrl }, preheader: heading });
  return { subject, html };
}

export function passwordChangedEmail(locale: EmailLocale) {
  const heading = L(locale, 'आपका पासवर्ड बदल दिया गया है', 'Your password was changed');
  const subject = L(locale, 'RajyaRank पासवर्ड बदला गया', 'Your RajyaRank password was changed');
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(locale, 'आपके RajyaRank खाते का पासवर्ड सफलतापूर्वक बदल दिया गया है। आपके सभी सक्रिय सत्र समाप्त कर दिए गए हैं।', 'Your RajyaRank account password was changed successfully. All of your active sessions have been signed out.')}</p>
    <p style="margin:0;color:#64748B;">${L(locale, 'अगर यह आपने नहीं किया, तो तुरंत हमसे संपर्क करें।', 'If this wasn’t you, contact us immediately.')}</p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}
