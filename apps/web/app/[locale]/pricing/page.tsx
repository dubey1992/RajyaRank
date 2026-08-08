import { cookies } from 'next/headers';
import { resolveLocale, getT } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe } from '@/lib/student';
import { BuyButton } from '@/components/BuyButton';
import { PublicHeader } from '@/components/PublicHeader';
import type { ProductView, EntitlementView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

function isLive(e: EntitlementView): boolean {
  return e.status === 'ACTIVE' && (!e.endsAt || new Date(e.endsAt) > new Date());
}

export default async function PricingPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const t = getT(locale);
  const cookie = cookies().toString();
  const [me, products] = await Promise.all([
    getMe(cookie),
    apiFetchServer<ProductView[]>('/products', cookie),
  ]);
  const loggedIn = !!me && me.kind === 'STUDENT';
  const entitlements = loggedIn ? ((await apiFetchServer<EntitlementView[]>('/student/entitlements', cookie)) ?? []) : [];
  const activeByProductId = new Map(entitlements.filter(isLive).map((e) => [e.productId, e]));

  const allProducts = products ?? [];
  const plans = allProducts.filter((p) => p.kind === 'SUBSCRIPTION');
  const courses = allProducts.filter((p) => p.kind !== 'SUBSCRIPTION');

  function ProductGrid({ items }: { items: ProductView[] }) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => {
          const active = activeByProductId.get(p.id);
          return (
            <article
              key={p.id}
              className={`flex flex-col rounded-xl border bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] ${active ? 'border-teal-500/50 ring-1 ring-teal-500/20' : 'border-line'}`}
            >
              <div className="flex items-start justify-between gap-2">
                {p.kind === 'SUBSCRIPTION' ? (
                  <span className="inline-block w-fit rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-extrabold text-orange-600">
                    {p.examId ? (hi ? 'Plus · एक परीक्षा' : 'Plus · one exam') : (hi ? 'Pro · सभी परीक्षाएँ' : 'Pro · all exams')}
                  </span>
                ) : <span />}
                {active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-extrabold text-success">
                    ✓ {hi ? 'सक्रिय' : 'Active'}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-lg font-black text-navy-900">{hi ? p.titleHi : p.titleEn}</h2>
              <div className="my-3 flex items-end gap-2">
                <span className="text-3xl font-black text-navy-950">₹{(p.priceMinor / 100).toLocaleString('en-IN')}</span>
                {p.originalPriceMinor && p.originalPriceMinor > p.priceMinor ? (
                  <span className="mb-1 text-sm text-muted line-through">₹{(p.originalPriceMinor / 100).toLocaleString('en-IN')}</span>
                ) : null}
              </div>
              <p className="mb-4 text-xs text-muted">
                {p.validityDays ? `${p.validityDays} ${hi ? 'दिन वैधता' : 'days validity'}` : hi ? 'आजीवन' : 'Lifetime'} · {p.accessType}
              </p>
              <div className="mt-auto border-t border-line pt-4">
                {active ? (
                  <p className="text-center text-sm font-bold text-navy-900">
                    {active.endsAt
                      ? `${hi ? 'तक मान्य' : 'Valid till'} ${new Date(active.endsAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : hi ? 'आजीवन मान्य' : 'Valid for life'}
                  </p>
                ) : (
                  <BuyButton productId={p.id} locale={locale} loggedIn={loggedIn} next={`/${locale}/pricing`} showCoupon />
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <PublicHeader locale={locale} me={me} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-100 px-3 py-1.5 text-[13px] font-extrabold text-teal-600">
            {hi ? 'सरल मूल्य' : 'Simple pricing'}
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-navy-950 md:text-[40px]">{t('nav.pricing')}</h1>
          <p className="mt-2 text-muted">{hi ? 'पारदर्शी मूल्य — कोई छिपा शुल्क नहीं।' : 'Transparent pricing — no hidden charges.'}</p>
        </div>

        {allProducts.length === 0 ? (
          <p className="text-center text-sm text-muted">{hi ? 'अभी कोई प्लान उपलब्ध नहीं है।' : 'No plans available yet.'}</p>
        ) : (
          <div className="grid gap-12">
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
