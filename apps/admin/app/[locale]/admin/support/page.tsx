import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { TicketPanel } from '@/components/TicketPanel';
import { ContactMessagesManager } from '@/components/ContactMessagesManager';
import { DemoRequestsManager } from '@/components/DemoRequestsManager';
import { TabbedSections, type TabSection } from '@/components/TabbedSections';
import type { TicketView, ContactMessageView, DemoRequestView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function SupportPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';

  const me = await getMeOrRedirect(locale);

  if (!can(me, 'support.manage')) {
    return (
      <Shell me={me} locale={locale} title="Support Queue">
        <AccessDenied locale={locale} permission="support.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [tickets, contactMessages, demoRequests] = await Promise.all([
    apiFetchServer<TicketView[]>('/staff/support-tickets', cookie),
    apiFetchServer<ContactMessageView[]>('/staff/contact-messages', cookie),
    apiFetchServer<DemoRequestView[]>('/staff/demo-requests', cookie),
  ]);

  const sections: TabSection[] = [
    {
      key: 'tickets',
      label: hi ? 'टिकट' : 'Tickets',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            Least-privilege support: student + ticket context only — never payment credentials or academic content.
          </p>
          {(tickets ?? []).length === 0 ? (
            <p className="text-sm text-muted">No tickets in the queue.</p>
          ) : (
            <div className="grid gap-3">
              {(tickets ?? []).map((t) => (
                <TicketPanel key={t.id} ticket={t} locale={locale} />
              ))}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'contact-messages',
      label: hi ? 'संपर्क संदेश' : 'Contact Messages',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi
              ? 'सार्वजनिक "संपर्क करें" फ़ॉर्म से आए संदेश — अज्ञात आगंतुकों, संभावित संस्थानों और मीडिया से।'
              : 'Submissions from the public "Contact Us" form — from anonymous visitors, prospective institutions, and media.'}
          </p>
          <ContactMessagesManager initial={contactMessages ?? []} locale={locale} />
        </>
      ),
    },
    {
      key: 'demo-requests',
      label: hi ? 'डेमो अनुरोध' : 'Demo Requests',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi
              ? 'लैंडिंग पेज के "संस्थानों के लिए" सेक्शन से आए डेमो अनुरोध — कोचिंग संस्थान, स्कूल और NGO से मिली लीड।'
              : 'Demo requests from the landing page\'s "For Institutions" section — leads from coaching institutes, schools, and NGOs.'}
          </p>
          <DemoRequestsManager initial={demoRequests ?? []} locale={locale} />
        </>
      ),
    },
  ];

  return (
    <Shell me={me} locale={locale} title="Support Queue">
      <TabbedSections sections={sections} />
    </Shell>
  );
}
