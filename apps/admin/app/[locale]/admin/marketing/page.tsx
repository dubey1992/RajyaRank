import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { TestimonialsManager } from '@/components/TestimonialsManager';
import { FaqManager } from '@/components/FaqManager';
import { StudyContentTeaserManager } from '@/components/StudyContentTeaserManager';
import type { TestimonialView, FaqView, StudyContentTeaserView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function MarketingPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'मार्केटिंग सामग्री' : 'Marketing Content';

  if (!can(me, 'marketing.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="marketing.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [testimonials, faqs, teasers] = await Promise.all([
    apiFetchServer<TestimonialView[]>('/admin/marketing/testimonials', cookie),
    apiFetchServer<FaqView[]>('/admin/marketing/faqs', cookie),
    apiFetchServer<StudyContentTeaserView[]>('/admin/marketing/study-content-teasers', cookie),
  ]);

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'सार्वजनिक मार्केटिंग होमपेज पर दिखने वाली सामग्री प्रबंधित करें। केवल "प्रकाशित" आइटम ही सार्वजनिक रूप से दिखते हैं।'
          : 'Manage content shown on the public marketing homepage. Only "published" items are shown publicly.'}
      </p>
      <div className="grid gap-6">
        <TestimonialsManager initial={testimonials ?? []} locale={locale} />
        <FaqManager initial={faqs ?? []} locale={locale} />
        <StudyContentTeaserManager initial={teasers ?? []} locale={locale} />
      </div>
    </Shell>
  );
}
