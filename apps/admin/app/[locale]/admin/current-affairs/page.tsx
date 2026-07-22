import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { CurrentAffairsManager } from '@/components/CurrentAffairsManager';
import type { CurrentAffairView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function CurrentAffairsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'करेंट अफेयर्स' : 'Current Affairs';

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
  const items = await apiFetchServer<CurrentAffairView[]>('/admin/current-affairs', cookie);

  return (
    <Shell me={me} locale={locale} title={title}>
      <CurrentAffairsManager initial={items ?? []} canMake={canMake} canCheck={canCheck} locale={locale} />
    </Shell>
  );
}
