import { renderEmailLayout, L, type EmailLocale } from './layout';

export function newLessonEmail(locale: EmailLocale, courseTitleHi: string, courseTitleEn: string, lessonTitleHi: string, lessonTitleEn: string) {
  const heading = L(locale, 'नया पाठ जुड़ा', 'A new lesson was added');
  const subject = L(locale, 'RajyaRank — आपके कोर्स में नया पाठ', 'RajyaRank — a new lesson in your course');
  const course = L(locale, courseTitleHi, courseTitleEn);
  const lesson = L(locale, lessonTitleHi, lessonTitleEn);
  const bodyHtml = `<p style="margin:0;">${L(locale, `<strong>${course}</strong> में एक नया पाठ जोड़ा गया है: <strong>${lesson}</strong>`, `A new lesson was added to <strong>${course}</strong>: <strong>${lesson}</strong>`)}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function announcementEmail(locale: EmailLocale, titleHi: string, titleEn: string, bodyHi: string, bodyEn: string) {
  const heading = L(locale, titleHi, titleEn);
  const subject = L(locale, `RajyaRank — ${titleHi}`, `RajyaRank — ${titleEn}`);
  const bodyHtml = `<p style="margin:0;white-space:pre-line;">${L(locale, bodyHi, bodyEn)}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function institutionJoinedEmail(locale: EmailLocale, orgName: string) {
  const heading = L(locale, `आप अब ${orgName} के सदस्य हैं`, `You're now a member of ${orgName}`);
  const subject = L(locale, `RajyaRank — ${orgName} की सदस्यता जुड़ी`, `RajyaRank — you joined ${orgName}`);
  const bodyHtml = `<p style="margin:0;">${L(
    locale,
    `आप अब <strong>${orgName}</strong> के सदस्य हैं। आपके संस्थान के विशेष कोर्स व मूल्य अब आपके खाते में स्वतः लागू होंगे — भविष्य में इसके लिए दोबारा कोड दर्ज करने की आवश्यकता नहीं है।`,
    `You're now a member of <strong>${orgName}</strong>. Your institute's courses and pricing now apply automatically to your account — no need to re-enter a code at checkout again.`,
  )}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function entitlementExpiringEmail(locale: EmailLocale, productTitleHi: string, productTitleEn: string, daysLeft: number) {
  const heading = L(locale, 'आपकी पहुंच जल्द समाप्त हो रही है', 'Your access is expiring soon');
  const subject = L(locale, 'RajyaRank — पहुंच जल्द समाप्त हो रही है', 'RajyaRank — your access is expiring soon');
  const product = L(locale, productTitleHi, productTitleEn);
  const bodyHtml = `<p style="margin:0;">${L(locale, `<strong>${product}</strong> तक आपकी पहुंच ${daysLeft} दिनों में समाप्त हो जाएगी। बिना रुकावट के जारी रखने के लिए अभी नवीनीकरण करें।`, `Your access to <strong>${product}</strong> expires in ${daysLeft} day(s). Renew now to keep learning without interruption.`)}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}
