import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { PublicHeader } from '@/components/PublicHeader';
import { StudentShell } from '@/components/StudentShell';
import { BuyButton } from '@/components/BuyButton';
import type { ContentProductView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const title = hi ? 'अध्ययन सामग्री अलग से खरीदें' : 'Buy individual study content';
  const description = hi
    ? 'पूरा कोर्स नहीं चाहिए? सिर्फ़ वह वीडियो, PDF, टेस्ट या पैक ख़रीदें जिसकी ज़रूरत है।'
    : "Don't need a whole course? Buy only the video, PDF, test, or pack you actually need.";
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/content`,
      languages: { 'hi-IN': '/hi/content', 'en-IN': '/en/content', 'x-default': '/en/content' },
    },
  };
}

const KIND_LABEL: Record<ContentProductView['kind'], { hi: string; en: string; icon: string }> = {
  LESSON: { hi: 'पाठ', en: 'Lesson', icon: '▶' },
  TEST: { hi: 'टेस्ट', en: 'Test', icon: '📝' },
  BUNDLE: { hi: 'पैक', en: 'Pack', icon: '🔁' },
};

export default async function ContentPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const [me, products] = await Promise.all([getMe(cookie), apiFetchServer<ContentProductView[]>('/content-products', '')]);
  const heading = L('अध्ययन सामग्री अलग से खरीदें', 'Buy individual study content');

  const grid = (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {(products ?? []).map((p) => (
        <article key={p.id} className="flex flex-col rounded-lg border border-line bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <span className="w-fit rounded-full bg-surface-soft px-2 py-1 text-[10px] font-extrabold text-muted">
            {KIND_LABEL[p.kind].icon} {hi ? KIND_LABEL[p.kind].hi : KIND_LABEL[p.kind].en}
          </span>
          <h3 className="mt-2 text-sm font-black text-navy-900">{hi ? p.titleHi : p.titleEn}</h3>
          {p.items?.length ? (
            <ul className="mt-1.5 text-xs text-muted">
              {p.items.map((it) => (
                <li key={it.id}>• {hi ? it.titleHi : it.titleEn}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <div>
              <span className="text-lg font-black text-navy-900">₹{(p.priceMinor / 100).toFixed(0)}</span>
              {p.originalPriceMinor ? <span className="ml-1.5 text-xs text-muted line-through">₹{(p.originalPriceMinor / 100).toFixed(0)}</span> : null}
            </div>
            <BuyButton productId={p.id} locale={locale} />
          </div>
        </article>
      ))}
      {(products ?? []).length === 0 ? <p className="text-sm text-muted">{L('अभी कोई सामग्री उपलब्ध नहीं है।', 'No individual content available yet.')}</p> : null}
    </div>
  );

  if (me && me.kind === 'STUDENT') {
    return (
      <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={heading} hasInstitute={Boolean(me.orgId)}>
        <div className="mb-6">
          <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{heading}</h1>
          <p className="mt-1 text-sm text-muted">
            {L('पूरा कोर्स नहीं चाहिए? सिर्फ़ वह वीडियो, PDF, टेस्ट या पैक ख़रीदें जिसकी ज़रूरत है।', "Don't need a whole course? Buy only the video, PDF, test, or pack you actually need.")}
          </p>
        </div>
        {grid}
      </StudentShell>
    );
  }

  return (
    <>
      <PublicHeader locale={locale} me={me} />
      <main id="main" className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-black text-navy-950">{heading}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {L('पूरा कोर्स नहीं चाहिए? सिर्फ़ वह वीडियो, PDF, टेस्ट या पैक ख़रीदें जिसकी ज़रूरत है।', "Don't need a whole course? Buy only the video, PDF, test, or pack you actually need.")}
        </p>
        <div className="mt-8">{grid}</div>
      </main>
    </>
  );
}
