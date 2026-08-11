import { renderEmailLayout } from './layout';

/** Internal staff notifications for the public site's "Contact Us" and
 *  "Request a demo" forms — always English (the recipient is RajyaRank's own
 *  team, not a bilingual end user), but built on the same shared layout/
 *  escaping discipline as every customer-facing template. Previously these
 *  were raw, un-escaped HTML strings assembled inline in the two services —
 *  standardized here for consistent styling and to close the HTML-injection
 *  gap (a submitter's name/message went straight into the email unescaped). */

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fieldRow(label: string, value: string): string {
  return `<tr><td style="padding:4px 12px 4px 0;font-size:13px;color:#64748B;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:4px 0;font-size:13px;color:#0B2F4F;font-weight:700;">${value}</td></tr>`;
}

function messageBlock(message: string): string {
  return `<p style="margin:12px 0 0;padding-top:12px;border-top:1px solid #E2E8F0;white-space:pre-wrap;">${escapeHtml(message)}</p>`;
}

export interface DemoRequestNotifyInput {
  institutionName: string;
  contactName: string;
  email: string;
  phone: string;
  role: string | null;
  city: string | null;
  studentCount: number | null;
  message: string | null;
  /** Deep link back to the admin Support queue's Demo Requests tab. */
  adminUrl: string;
}

export function demoRequestNotifyEmail(input: DemoRequestNotifyInput) {
  const subject = `New demo request: ${input.institutionName}`;
  const rows = [
    fieldRow('Institution', escapeHtml(input.institutionName)),
    fieldRow('Contact', escapeHtml(input.contactName)),
    fieldRow('Email', escapeHtml(input.email)),
    fieldRow('Phone', escapeHtml(input.phone)),
    input.role ? fieldRow('Role', escapeHtml(input.role)) : '',
    input.city ? fieldRow('City', escapeHtml(input.city)) : '',
    input.studentCount ? fieldRow('Approx. students', String(input.studentCount)) : '',
  ].join('');
  const bodyHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">${rows}</table>${input.message ? messageBlock(input.message) : ''}`;
  const html = renderEmailLayout({
    locale: 'en',
    heading: 'New demo request',
    preheader: `${input.institutionName} — ${input.contactName}`,
    bodyHtml,
    cta: { label: 'View in admin', href: input.adminUrl },
    footerNote: 'You are receiving this because you manage RajyaRank sales leads.',
  });
  return { subject, html };
}

export interface ContactMessageNotifyInput {
  name: string;
  email: string;
  phone: string | null;
  category: string;
  message: string;
  /** Deep link back to the admin Support queue's Contact Messages tab. */
  adminUrl: string;
}

export function contactMessageNotifyEmail(input: ContactMessageNotifyInput) {
  const subject = `New contact message: ${input.category} — ${input.name}`;
  const rows = [
    fieldRow('Name', escapeHtml(input.name)),
    fieldRow('Email', escapeHtml(input.email)),
    input.phone ? fieldRow('Phone', escapeHtml(input.phone)) : '',
    fieldRow('Category', escapeHtml(input.category)),
  ].join('');
  const bodyHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">${rows}</table>${messageBlock(input.message)}`;
  const html = renderEmailLayout({
    locale: 'en',
    heading: 'New contact message',
    preheader: `${input.category} — ${input.name}`,
    bodyHtml,
    cta: { label: 'View in admin', href: input.adminUrl },
    footerNote: 'You are receiving this because you manage RajyaRank support requests.',
  });
  return { subject, html };
}
