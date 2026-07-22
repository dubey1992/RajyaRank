import { notFound } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { QuickQuestionForm } from '@/components/QuickQuestionForm';
import { TicketPanel } from '@/components/TicketPanel';
import type { TicketView } from '@rajyarank/contracts';

/**
 * DEV-ONLY, UNAUTHENTICATED preview of the quick-question + support-ticket forms
 * so their client-side validation can be exercised without the full API/DB stack.
 * 404s in production. The real routes (/admin/question-bank, /admin/support) are
 * staff-auth gated and hit the live API.
 */
export const dynamic = 'force-dynamic';

const MOCK_TICKET: TicketView = {
  id: 'preview',
  category: 'PAYMENT',
  subject: 'Sample ticket — refund request',
  status: 'OPEN',
  createdAt: '2026-07-14T00:00:00.000Z',
  replies: [
    {
      id: 'r1',
      authorUserId: 'student-1',
      bodyText: 'I was charged twice for my BPSC course. Please help.',
      internal: false,
      createdAt: '2026-07-14T00:00:00.000Z',
    },
  ],
};

export default function FormPreviewPage({ params }: { params: { locale: string } }) {
  if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') notFound();
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 rounded-md border border-orange-500 bg-orange-100/50 p-3 text-sm text-warning">
        <strong>{hi ? 'डेव प्रीव्यू' : 'Dev preview'}</strong> —{' '}
        {hi
          ? 'केवल फ़ॉर्म वैलिडेशन जाँचने के लिए (कोई लॉगिन नहीं)। खाली/अधूरा सबमिट करके इनलाइन संदेश देखें। सफल सबमिट API के बिना नेटवर्क त्रुटि देगा।'
          : 'For validating form checks only (no login). Submit empty/incomplete to see the inline messages. A successful submit will show a network error since the API is not running.'}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-black text-navy-900">
            {hi ? 'क्विक प्रश्न फ़ॉर्म' : 'Quick-question form'}
          </h2>
          <QuickQuestionForm locale={locale} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-black text-navy-900">
            {hi ? 'सपोर्ट टिकट रिप्लाई' : 'Support-ticket reply'}
          </h2>
          <TicketPanel ticket={MOCK_TICKET} locale={locale} />
        </section>
      </div>
    </main>
  );
}
