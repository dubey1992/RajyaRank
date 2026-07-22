import { renderEmailLayout, L, type EmailLocale } from './layout';

export function doubtAnsweredEmail(locale: EmailLocale) {
  const heading = L(locale, 'आपके प्रश्न का उत्तर मिला', 'Your doubt has been answered');
  const subject = L(locale, 'आपके RajyaRank प्रश्न का उत्तर मिला', 'Your RajyaRank doubt was answered');
  const bodyHtml = `<p style="margin:0;">${L(locale, 'एक शिक्षक ने आपके प्रश्न का उत्तर दिया है। उत्तर देखने के लिए ऐप खोलें।', 'A teacher has answered your doubt. Open the app to view the response.')}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

export function supportReplyEmail(locale: EmailLocale) {
  const heading = L(locale, 'सपोर्ट टिकट अपडेट', 'Support ticket update');
  const subject = L(locale, 'RajyaRank सपोर्ट अपडेट', 'RajyaRank support update');
  const bodyHtml = `<p style="margin:0;">${L(locale, 'आपके सपोर्ट टिकट पर एक नया उत्तर है।', 'Your support ticket has a new reply.')}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}

const STATUS_LABELS: Record<string, { hi: string; en: string }> = {
  OPEN: { hi: 'खुला', en: 'Open' },
  IN_PROGRESS: { hi: 'प्रगति पर', en: 'In progress' },
  WAITING_ON_STUDENT: { hi: 'आपकी प्रतिक्रिया लंबित', en: 'Waiting on you' },
  RESOLVED: { hi: 'समाधान हो गया', en: 'Resolved' },
  CLOSED: { hi: 'बंद', en: 'Closed' },
};

export function supportStatusChangedEmail(locale: EmailLocale, status: string) {
  const label = STATUS_LABELS[status];
  const statusText = label ? L(locale, label.hi, label.en) : status;
  const heading = L(locale, 'सपोर्ट टिकट की स्थिति बदली', 'Your support ticket status changed');
  const subject = L(locale, 'RajyaRank सपोर्ट टिकट अपडेट', 'RajyaRank support ticket update');
  const bodyHtml = `<p style="margin:0;">${L(locale, `आपके सपोर्ट टिकट की स्थिति अब है: <strong>${statusText}</strong>`, `Your support ticket status is now: <strong>${statusText}</strong>`)}</p>`;
  const html = renderEmailLayout({ locale, heading, bodyHtml, preheader: heading });
  return { subject, html };
}
