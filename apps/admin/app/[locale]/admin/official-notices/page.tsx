import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { OfficialNoticesManager } from '@/components/OfficialNoticesManager';
import type { OfficialNoticeView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

interface ExamRef { id: string; code: string; nameHi: string; nameEn: string }

export default async function OfficialNoticesPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'आधिकारिक सूचनाएँ' : 'Official Notices';

  const canMake = can(me, 'content.create');
  const canCheck = can(me, 'content.review');
  if (!canMake && !canCheck) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="content.create" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [items, exams] = await Promise.all([
    apiFetchServer<OfficialNoticeView[]>('/admin/official-notices', cookie),
    apiFetchServer<ExamRef[]>('/admin/catalogue/exams', cookie),
  ]);

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'एक आधिकारिक परीक्षा-निकाय सूचना दर्ज करें, प्रभावित कॉन्सेप्ट टैग करें, फिर समीक्षा व अनुमोदन के बाद यह परीक्षा कैलेंडर अपडेट करती है और लक्षित छात्रों को सूचित करती है।'
          : 'Enter an official exam-body notice, tag the concepts it affects, then after review and approval it updates the exam calendar and notifies targeted students.'}
      </p>
      <OfficialNoticesManager initial={items ?? []} initialExams={exams ?? []} canMake={canMake} canCheck={canCheck} locale={locale} />
    </Shell>
  );
}
