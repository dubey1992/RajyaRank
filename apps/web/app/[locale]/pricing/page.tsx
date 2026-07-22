import { cookies } from 'next/headers';
import { resolveLocale, getT } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { BuyButton } from '@/components/BuyButton';
import { PublicHeader } from '@/components/PublicHeader';
import type { ProductView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function PricingPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const t = getT(locale);
  const products = (await apiFetchServer<ProductView[]>('/products', cookies().toString())) ?? [];
  const plans = products.filter((p) => p.kind === 'SUBSCRIPTION');
  const courses = products.filter((p) => p.kind !== 'SUBSCRIPTION');

  function ProductGrid({ items }: { items: ProductView[] }) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <article key={p.id} className="flex flex-col rounded-lg border border-line bg-white p-5">
            <h2 className="text-lg font-black text-navy-900">{hi ? p.titleHi : p.titleEn}</h2>
            {p.kind === 'SUBSCRIPTION' ? (
              <span className="mt-1 inline-block w-fit rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-extrabold text-success">
                {p.examId ? (hi ? 'Plus · एक परीक्षा' : 'Plus · one exam') : (hi ? 'Pro · सभी परीक्षाएँ' : 'Pro · all exams')}
              </span>
            ) : null}
            <div className="my-3 flex items-end gap-2">
              <span className="text-3xl font-black text-navy-950">₹{(p.priceMinor / 100).toLocaleString('en-IN')}</span>
              {p.originalPriceMinor && p.originalPriceMinor > p.priceMinor ? (
                <span className="mb-1 text-sm text-muted line-through">₹{(p.originalPriceMinor / 100).toLocaleString('en-IN')}</span>
              ) : null}
            </div>
            <p className="mb-4 text-xs text-muted">
              {p.validityDays ? `${p.validityDays} ${hi ? 'दिन वैधता' : 'days validity'}` : hi ? 'आजीवन' : 'Lifetime'} · {p.accessType}
            </p>
            <div className="mt-auto">
              <BuyButton productId={p.id} locale={locale} />
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-black text-navy-950">{t('nav.pricing')}</h1>
      <p className="mb-8 text-muted">{hi ? 'पारदर्शी मूल्य — कोई छिपा शुल्क नहीं।' : 'Transparent pricing — no hidden charges.'}</p>

      {products.length === 0 ? (
        <p className="text-sm text-muted">{hi ? 'अभी कोई प्लान उपलब्ध नहीं है।' : 'No plans available yet.'}</p>
      ) : (
        <div className="grid gap-10">
          {plans.length > 0 ? (
            <section>
              <h2 className="mb-1 text-xl font-extrabold text-navy-950">{hi ? 'प्लान' : 'Plans'}</h2>
              <p className="mb-4 text-sm text-muted">
                {hi ? 'एक बार भुगतान करें, तय दिनों तक पहुँच पाएं — कोई ऑटो-रिन्यू नहीं।' : 'Pay once, get access for a fixed number of days — no auto-renewal.'}
              </p>
              <ProductGrid items={plans} />
            </section>
          ) : null}
          {courses.length > 0 ? (
            <section>
              <h2 className="mb-1 text-xl font-extrabold text-navy-950">{hi ? 'कोर्स और टेस्ट सीरीज़' : 'Courses & Test Series'}</h2>
              <p className="mb-4 text-sm text-muted">{hi ? 'एक विशिष्ट कोर्स या टेस्ट सीरीज़ खरीदें।' : 'Buy access to one specific course or test series.'}</p>
              <ProductGrid items={courses} />
            </section>
          ) : null}
        </div>
      )}
      </main>
    </>
  );
}
