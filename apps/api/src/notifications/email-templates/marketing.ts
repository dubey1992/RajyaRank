import { renderEmailLayout } from './layout';

/** Super Admin-composed promotional/marketing broadcast (see
 *  apps/api/src/marketing/marketing-email.service.ts). Unlike the other
 *  templates, subject/body are free text the admin writes at send time —
 *  there's no fixed bilingual copy to hardcode, so this just wraps whatever
 *  they typed in the shared layout. Plain-text paragraphs (blank line =
 *  paragraph break, single newline = <br/>) rather than raw HTML, so an
 *  admin composing in a plain textarea can't break the layout or inject
 *  markup. */
export function promotionalEmail(subject: string, message: string, cta?: { label: string; href: string }) {
  const bodyHtml = message
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 12px;">${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  const html = renderEmailLayout({
    locale: 'en',
    heading: subject,
    bodyHtml,
    preheader: subject,
    cta,
    footerNote: 'You are receiving this email because you have an account on RajyaRank.',
  });
  return { subject, html };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
