import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { AnnouncementComposer } from '@/components/AnnouncementComposer';
import type { AnnouncementView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'घोषणाएँ' : 'Announcements';

  if (!can(me, 'marketing.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="marketing.manage" />
      </Shell>
    );
  }

  const announcements = await apiFetchServer<AnnouncementView[]>('/admin/announcements', cookies().toString());

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'सभी छात्रों व स्टाफ़ को, या किसी एक समूह को, ईमेल व इन-ऐप सूचना के रूप में एक प्लेटफ़ॉर्म-व्यापी घोषणा भेजें।'
          : 'Send a platform-wide announcement — by email and in-app notification — to all students and staff, or to just one group.'}
      </p>
      <AnnouncementComposer initial={announcements ?? []} locale={locale} />
    </Shell>
  );
}
