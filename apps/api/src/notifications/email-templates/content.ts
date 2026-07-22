import { renderEmailLayout, L, type EmailLocale } from './layout';

function title(locale: EmailLocale, titleHi: string, titleEn: string): string {
  return L(locale, titleHi, titleEn);
}

export function contentSubmittedEmail(locale: EmailLocale, titleHi: string, titleEn: string) {
  const heading = L(locale, 'समीक्षा हेतु नया कंटेंट', 'New content submitted for review');
  const subject = L(locale, 'RajyaRank — समीक्षा हेतु नया कंटेंट', 'RajyaRank — new content submitted for review');
  const t = title(locale, titleHi, titleEn);
  const bodyHtml = `<p style="margin:0;">${L(locale, `<strong>${t}</strong> समीक्षा के लिए प्रस्तुत किया गया है।`, `<strong>${t}</strong> has been submitted for review.`)}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function correctionRequestedEmail(locale: EmailLocale, titleHi: string, titleEn: string, note: string) {
  const heading = L(locale, 'सुधार का अनुरोध किया गया', 'A correction was requested');
  const subject = L(locale, 'RajyaRank — कंटेंट में सुधार आवश्यक', 'RajyaRank — correction requested on your content');
  const t = title(locale, titleHi, titleEn);
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(locale, `<strong>${t}</strong> पर समीक्षक ने सुधार का अनुरोध किया है।`, `A reviewer has requested a correction on <strong>${t}</strong>.`)}</p>
    <p style="margin:0;color:#64748B;">${L(locale, 'टिप्पणी', 'Note')}: ${note}</p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function contentApprovedEmail(locale: EmailLocale, titleHi: string, titleEn: string) {
  const heading = L(locale, 'कंटेंट अनुमोदित', 'Your content was approved');
  const subject = L(locale, 'RajyaRank — कंटेंट अनुमोदित', 'RajyaRank — your content was approved');
  const t = title(locale, titleHi, titleEn);
  const bodyHtml = `<p style="margin:0;">${L(locale, `<strong>${t}</strong> अनुमोदित कर दिया गया है और प्रकाशन के लिए तैयार है।`, `<strong>${t}</strong> has been approved and is ready to publish.`)}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function contentRejectedEmail(locale: EmailLocale, titleHi: string, titleEn: string, reason: string) {
  const heading = L(locale, 'कंटेंट अस्वीकृत', 'Your content was rejected');
  const subject = L(locale, 'RajyaRank — कंटेंट अस्वीकृत', 'RajyaRank — your content was rejected');
  const t = title(locale, titleHi, titleEn);
  const bodyHtml = `
    <p style="margin:0 0 12px;">${L(locale, `<strong>${t}</strong> को अस्वीकृत कर दिया गया है।`, `<strong>${t}</strong> has been rejected.`)}</p>
    <p style="margin:0;color:#64748B;">${L(locale, 'कारण', 'Reason')}: ${reason}</p>
  `;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function contentPublishedEmail(locale: EmailLocale, titleHi: string, titleEn: string) {
  const heading = L(locale, 'कंटेंट प्रकाशित हुआ', 'Content published');
  const subject = L(locale, 'RajyaRank — कंटेंट प्रकाशित', 'RajyaRank — content published');
  const t = title(locale, titleHi, titleEn);
  const bodyHtml = `<p style="margin:0;">${L(locale, `<strong>${t}</strong> अब छात्रों के लिए प्रकाशित और उपलब्ध है।`, `<strong>${t}</strong> is now published and available to students.`)}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}
