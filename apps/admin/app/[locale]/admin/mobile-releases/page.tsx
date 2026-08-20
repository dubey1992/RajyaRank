import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { MobileReleaseManager } from '@/components/MobileReleaseManager';
import type { MobileAppReleaseView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function MobileReleasesPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'मोबाइल ऐप' : 'Mobile App';

  if (!can(me, 'app.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="app.manage" />
      </Shell>
    );
  }

  const releases = await apiFetchServer<MobileAppReleaseView[]>('/admin/mobile-releases', cookies().toString());

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'छात्र Android ऐप के नए संस्करण अपलोड और प्रकाशित करें। प्रकाशित संस्करण ही मार्केटिंग पेज के "ऐप डाउनलोड करें" बटन पर उपलब्ध होता है।'
          : 'Upload and publish new versions of the student Android app. The published version is what the marketing page\'s "Download the app" button serves.'}
      </p>
      <MobileReleaseManager initial={releases ?? []} locale={locale} />
    </Shell>
  );
}
