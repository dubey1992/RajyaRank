import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe } from '@/lib/student';
import { PublicHeader } from '@/components/PublicHeader';
import type { FaqView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const title = hi ? 'सामान्य प्रश्न' : 'Frequently asked questions';
  const description = hi
    ? 'कोर्स, भुगतान, टेस्ट और अकाउंट से जुड़े सभी सामान्य प्रश्नों के उत्तर।'
    : 'Answers to every common question about courses, payments, tests and your account.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/faq`,
      languages: { 'hi-IN': '/hi/faq', 'en-IN': '/en/faq', 'x-default': '/hi/faq' },
    },
  };
}

export default async function FaqPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const [me, faqRows] = await Promise.all([
    getMe(cookie),
    apiFetchServer<FaqView[]>('/faqs', ''),
  ]);
  const faqs = faqRows ?? [];

  // Must mirror what's actually visible on this page (Google's structured-data
  // guidelines require an exact match) — this page renders every faq, unlike
  // the homepage's 5-item preview, which carries its own separate FAQPage block.
  const jsonLd =
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: hi ? f.questionHi : f.questionEn,
            acceptedAnswer: { '@type': 'Answer', text: hi ? f.answerHi : f.answerEn },
          })),
        }
      : null;

  return (
    <>
      <PublicHeader locale={locale} me={me} />
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}
      <main id="main" className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <div className="mb-9 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">
            {L('सामान्य प्रश्न', 'Common questions')}
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">
            {L('सभी सामान्य प्रश्न', 'All frequently asked questions')}
          </h1>
          <p className="mt-2 text-muted">
            {L('कोर्स, भुगतान, टेस्ट और अकाउंट से जुड़े हर सवाल का जवाब यहाँ है।', 'Every answer about courses, payments, tests and your account, in one place.')}
          </p>
        </div>
        {faqs.length === 0 ? (
          <p className="text-center text-sm text-muted">{L('अभी कोई प्रश्न उपलब्ध नहीं है।', 'No questions available yet.')}</p>
        ) : (
          <div className="grid gap-3">
            {faqs.map((f) => (
              <details key={f.id} className="group rounded-md border border-line bg-white">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 font-extrabold text-navy-900 [&::-webkit-details-marker]:hidden">
                  <span>{hi ? f.questionHi : f.questionEn}</span>
                  <span className="text-xl text-orange-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-muted">{hi ? f.answerHi : f.answerEn}</p>
              </details>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
