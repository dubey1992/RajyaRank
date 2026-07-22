/**
 * Shared HTML shell for every outbound RajyaRank email. Table-based and
 * inline-styled (no external CSS/JS) — the only layout that renders
 * consistently across Gmail/Outlook/mobile mail clients. Brand colors match
 * `packages/ui`'s `LogoMark`/`Logo`: navy #0B2F4F, orange #F97316, teal #0EA58A.
 */

export type EmailLocale = 'hi' | 'en';

/** Bilingual string pick — same `L(hi, en)` idiom used across the rest of the app. */
export function L(locale: EmailLocale, hi: string, en: string): string {
  return locale === 'hi' ? hi : en;
}

export interface EmailLayoutInput {
  locale: EmailLocale;
  /** Short preview text most inboxes show next to the subject; not otherwise visible. */
  preheader?: string;
  heading: string;
  /** Pre-built inner HTML (paragraphs, lists, etc.) — callers own their own markup. */
  bodyHtml: string;
  cta?: { label: string; href: string };
  footerNote?: string;
}

export function renderEmailLayout({ locale, preheader, heading, bodyHtml, cta, footerNote }: EmailLayoutInput): string {
  const year = new Date().getFullYear();
  const rights = L(locale, `© ${year} RajyaRank. सर्वाधिकार सुरक्षित।`, `© ${year} RajyaRank. All rights reserved.`);
  const auto = footerNote ?? L(locale, 'यह एक स्वचालित ईमेल है, कृपया इसका जवाब न दें।', 'This is an automated email — please do not reply.');

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr>
<td style="background:#0B2F4F;padding:20px 28px;">
<span style="font-size:20px;font-weight:900;color:#ffffff;">Rajya<span style="color:#F97316;">Rank</span></span>
</td>
</tr>
<tr>
<td style="padding:32px 28px 8px;">
<h1 style="margin:0 0 16px;font-size:19px;font-weight:900;color:#0B2F4F;">${heading}</h1>
<div style="font-size:14px;line-height:1.6;color:#334155;">${bodyHtml}</div>
${
  cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr><td style="background:#F97316;border-radius:8px;"><a href="${cta.href}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">${cta.label}</a></td></tr></table>`
    : ''
}
</td>
</tr>
<tr>
<td style="padding:20px 28px 28px;border-top:1px solid #E2E8F0;">
<p style="margin:0 0 4px;font-size:11px;color:#94A3B8;">${auto}</p>
<p style="margin:0;font-size:11px;color:#94A3B8;">${rights}</p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
