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
        <div className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-muted">
          <p>{L('विकसित द्वारा', 'Developed by')} <strong className="text-ink">NEXTWEBGEN INFOTECH PRIVATE LIMITED</strong></p>
          <p className="mt-1">
            Oakwood Estate Akashneem Marg, OE-410, Oakwood Estate Condominium Association, DLF City Phase-II, Gurgaon, Haryana 122002, India
          </p>
          <p className="mt-1">GSTIN: 06AAHCN3398J1Z0</p>
        </div>
      </main>
    </>
  );
}
