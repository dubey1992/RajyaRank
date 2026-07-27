import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ActivityLogManager } from '@/components/ActivityLogManager';

export const dynamic = 'force-dynamic';

export default async function ActivitiesPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const me = await getMeOrRedirect(locale);
  const title = locale === 'hi' ? 'हाल की गतिविधियाँ' : 'Recent Activities';

  if (!can(me, 'audit.view')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="audit.view" />
      </Shell>
    );
  }

  return (
    <Shell me={me} locale={locale} title={title}>
      <ActivityLogManager locale={locale} />
    </Shell>
  );
}
