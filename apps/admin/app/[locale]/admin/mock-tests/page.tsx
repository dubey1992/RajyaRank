import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { MockTestsManager } from '@/components/MockTestsManager';
import type { TestListItem } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function MockTestsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'मॉक टेस्ट' : 'Mock Tests';

  // A pure reviewer (Academic Reviewer) holds content.approve but not
  // test.create — they still need this page to approve/reject mock tests.
  if (!can(me, 'test.create') && !can(me, 'content.approve')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="test.create" />
      </Shell>
    );
  }

  const tests = (await apiFetchServer<TestListItem[]>('/staff/tests', cookies().toString())) ?? [];

  return (
    <Shell me={me} locale={locale} title={title}>
      <MockTestsManager initialTests={tests} me={me} locale={locale} />
    </Shell>
  );
}
