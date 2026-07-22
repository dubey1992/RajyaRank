import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { StaffTable } from '@/components/StaffTable';
import { InviteStaff } from '@/components/InviteStaff';
import { AccessDenied } from '@/components/AccessDenied';
import type { StaffListItem } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function StaffPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'स्टाफ़ प्रबंधन' : 'Staff Management';

  if (!can(me, 'user.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="user.manage" />
      </Shell>
    );
  }

  const staff = (await apiFetchServer<StaffListItem[]>('/admin/staff', cookies().toString())) ?? [];

  return (
    <Shell me={me} locale={locale} title={title}>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <StaffTable
          initial={staff}
          locale={locale}
          canDisable={can(me, 'user.disable')}
          canAssign={can(me, 'assignment.manage')}
        />
        {can(me, 'user.invite') ? (
          <div>
            <h2 className="mb-3 text-lg font-extrabold text-navy-900">{hi ? 'नया स्टाफ़ आमंत्रित करें' : 'Invite new staff'}</h2>
            <InviteStaff locale={locale} />
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
