import { renderEmailLayout, L, type EmailLocale } from './layout';

const ROLE_LABELS: Record<string, { hi: string; en: string }> = {
  STUDENT: { hi: 'छात्र', en: 'Student' },
  TEACHER: { hi: 'शिक्षक', en: 'Teacher' },
  QUESTION_SETTER: { hi: 'प्रश्न-सेटर', en: 'Question Setter' },
  ACADEMIC_REVIEWER: { hi: 'समीक्षक', en: 'Academic Reviewer' },
  CONTENT_ADMIN: { hi: 'कंटेंट एडमिन', en: 'Content Admin' },
  SUPPORT_AGENT: { hi: 'सहायता एजेंट', en: 'Support Agent' },
  SUPER_ADMIN: { hi: 'सुपर एडमिन', en: 'Super Admin' },
  ACADEMIC_HEAD: { hi: 'शैक्षणिक प्रमुख', en: 'Academic Head' },
};

function roleLabel(roleKey: string, locale: EmailLocale): string {
  const b = ROLE_LABELS[roleKey];
  return b ? L(locale, b.hi, b.en) : roleKey;
}

export function staffInvitedEmail(locale: EmailLocale, fullName: string, roleKey: string, link: string) {
  const heading = L(locale, 'आपको RajyaRank में आमंत्रित किया गया है', 'You have been invited to RajyaRank');
  const subject = L(locale, 'RajyaRank में शामिल होने का आमंत्रण', 'You have been invited to RajyaRank');
  const role = roleLabel(roleKey, locale);
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(locale, `नमस्ते ${fullName},`, `Hello ${fullName},`)}</p>
    <p style="margin:0;">${L(locale, `आपको <strong>${role}</strong> के रूप में आमंत्रित किया गया है। नीचे दिए बटन से अपना खाता सेट करें।`, `You have been invited as <strong>${role}</strong>. Set up your account using the button below.`)}</p>
    <p style="margin:16px 0 0;color:#64748B;">${L(locale, 'यह लिंक जल्द ही समाप्त हो जाएगा।', 'This link expires soon.')}</p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, cta: { label: L(locale, 'खाता सेट करें', 'Set up your account'), href: link }, preheader: heading });
  return { subject, html };
}

export function staffInviteResentEmail(locale: EmailLocale, fullName: string, roleKey: string, link: string) {
  const heading = L(locale, 'आपका आमंत्रण फिर से भेजा गया', 'Your invitation was resent');
  const subject = L(locale, 'RajyaRank आमंत्रण — नया लिंक', 'Your RajyaRank invitation — new link');
  const role = roleLabel(roleKey, locale);
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(locale, `नमस्ते ${fullName},`, `Hello ${fullName},`)}</p>
    <p style="margin:0;">${L(locale, `आपके <strong>${role}</strong> आमंत्रण के लिए एक नया लिंक जारी किया गया है। पुराना लिंक अब काम नहीं करेगा।`, `A new link has been issued for your <strong>${role}</strong> invitation. The previous link no longer works.`)}</p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, cta: { label: L(locale, 'खाता सेट करें', 'Set up your account'), href: link }, preheader: heading });
  return { subject, html };
}

export function staffInviteAcceptedEmail(locale: EmailLocale, fullName: string, loginUrl: string) {
  const heading = L(locale, 'RajyaRank में आपका स्वागत है', 'Welcome to RajyaRank');
  const subject = L(locale, 'RajyaRank में आपका स्वागत है', 'Welcome to RajyaRank');
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(locale, `नमस्ते ${fullName},`, `Hello ${fullName},`)}</p>
    <p style="margin:0;">${L(locale, 'आपका खाता सफलतापूर्वक सेट हो गया है। अब आप स्टाफ़ पैनल में लॉगिन कर सकते हैं।', 'Your account has been set up successfully. You can now sign in to the staff panel.')}</p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, cta: { label: L(locale, 'लॉगिन करें', 'Sign in'), href: loginUrl }, preheader: heading });
  return { subject, html };
}

export function staffInviteRevokedEmail(locale: EmailLocale, fullName: string) {
  const heading = L(locale, 'आमंत्रण रद्द कर दिया गया', 'Your invitation was revoked');
  const subject = L(locale, 'RajyaRank आमंत्रण रद्द', 'Your RajyaRank invitation was revoked');
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(locale, `नमस्ते ${fullName},`, `Hello ${fullName},`)}</p>
    <p style="margin:0;">${L(locale, 'RajyaRank में शामिल होने का आपका आमंत्रण रद्द कर दिया गया है। यदि आपको लगता है कि यह एक त्रुटि है, तो कृपया आमंत्रणकर्ता से संपर्क करें।', 'Your invitation to join RajyaRank has been revoked. If you believe this is a mistake, please contact whoever invited you.')}</p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function staffAccountStatusChangedEmail(locale: EmailLocale, status: 'SUSPENDED' | 'ACTIVE') {
  const suspended = status === 'SUSPENDED';
  const heading = suspended ? L(locale, 'आपका खाता निलंबित कर दिया गया है', 'Your account has been suspended') : L(locale, 'आपका खाता पुनः सक्रिय कर दिया गया है', 'Your account has been reactivated');
  const subject = suspended ? L(locale, 'RajyaRank खाता निलंबित', 'Your RajyaRank account was suspended') : L(locale, 'RajyaRank खाता पुनः सक्रिय', 'Your RajyaRank account was reactivated');
  const bodyHtml = suspended
    ? `<p style="margin:0;">${L(locale, 'एक व्यवस्थापक ने आपका खाता निलंबित कर दिया है और आपके सक्रिय सत्र समाप्त कर दिए गए हैं। अधिक जानकारी के लिए अपने Super Admin से संपर्क करें।', 'An administrator has suspended your account and signed out all of your active sessions. Contact your Super Admin for details.')}</p>`
    : `<p style="margin:0;">${L(locale, 'आपका खाता पुनः सक्रिय कर दिया गया है — आप अब सामान्य रूप से लॉगिन कर सकते हैं।', 'Your account has been reactivated — you can now sign in as usual.')}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function staffForcedPasswordResetEmail(locale: EmailLocale, loginUrl: string) {
  const heading = L(locale, 'पासवर्ड रीसेट आवश्यक', 'Password reset required');
  const subject = L(locale, 'RajyaRank पासवर्ड रीसेट आवश्यक', 'RajyaRank password reset required');
  const bodyHtml = `
    <p style="margin:0;">${L(locale, 'एक व्यवस्थापक ने आपको अपना पासवर्ड रीसेट करने की आवश्यकता बताई है। जारी रखने के लिए स्टाफ़ लॉगिन पेज पर "पासवर्ड भूल गए" का उपयोग करें।', 'An administrator has required you to reset your password. Use “Forgot password?” on the staff login page to continue.')}</p>
    <p style="margin:16px 0 0;color:#64748B;">${L(locale, 'आपके सभी सक्रिय सत्र समाप्त कर दिए गए हैं।', 'All of your active sessions have been signed out.')}</p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, cta: { label: L(locale, 'स्टाफ़ लॉगिन', 'Go to staff login'), href: loginUrl }, preheader: heading });
  return { subject, html };
}
