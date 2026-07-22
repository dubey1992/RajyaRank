import { resolveLocale } from '@/lib/i18n';
import { PublicHeader } from '@/components/PublicHeader';
import { ContactForm } from '@/components/ContactForm';

export const dynamic = 'force-static';

export default function ContactPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-black text-navy-950 md:text-3xl">{L('संपर्क करें', 'Contact us')}</h1>
        <p className="mt-2 text-muted">
          {L(
            'प्रश्न, संस्थान साझेदारी या सहायता के लिए हमें लिखें — हम जल्द जवाब देंगे।',
            'Questions, institution partnerships, or support — write to us and we will get back to you soon.',
          )}
        </p>
        <div className="mt-8">
          <ContactForm locale={locale} />
        </div>
      </main>
    </>
  );
}
