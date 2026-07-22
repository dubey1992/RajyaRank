import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { StudentPaymentsManager } from '@/components/StudentPaymentsManager';
import type { AcademicOrderView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function StudentPaymentsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'छात्र भुगतान' : 'Student Payments';

  if (!can(me, 'course.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="course.manage" />
      </Shell>
    );
  }

  const orders = await apiFetchServer<AcademicOrderView[]>('/academic/orders', cookies().toString());

  if (!orders) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} />
      </Shell>
    );
  }

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi ? 'एक ही लेजर में आंतरिक, बाहरी और प्रायोजित पहुँच।' : 'Internal, external and sponsored access in a single ledger.'}
      </p>
      <StudentPaymentsManager orders={orders} locale={locale} />
    </Shell>
  );
}
