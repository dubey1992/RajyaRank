import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ContentPacksManager } from '@/components/ContentPacksManager';
import type { ContentPackAdminView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function ContentPacksPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'कंटेंट पैक' : 'Content Packs';

  if (!can(me, 'course.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="course.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const packs = await apiFetchServer<ContentPackAdminView[]>('/admin/content-packs', cookie);

  return (
    <Shell me={me} locale={locale} title={title}>
      <ContentPacksManager initial={packs ?? []} locale={locale} />
    </Shell>
  );
}
