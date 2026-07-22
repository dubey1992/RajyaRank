import Link from 'next/link';
import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { AssignmentsEditor, type CatalogRef } from '@/components/AssignmentsEditor';
import type { StaffDetail } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function StaffAssignmentsPage({ params }: { params: { locale: string; id: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'स्टाफ़ असाइनमेंट' : 'Staff Assignments';

  if (!can(me, 'user.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="assignment.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const staff = await apiFetchServer<StaffDetail>(`/admin/staff/${params.id}`, cookie);
  const states = (await apiFetchServer<CatalogRef[]>('/states', cookie)) ?? [];
  const exams = (await apiFetchServer<CatalogRef[]>('/exams', cookie)) ?? [];

  return (
    <Shell me={me} locale={locale} title={title}>
      <Link href={`/${locale}/admin/staff`} className="mb-4 inline-block text-sm font-bold text-navy-900 hover:underline">
        ← {hi ? 'स्टाफ़ सूची पर वापस' : 'Back to staff list'}
      </Link>

      {!staff ? (
        <AccessDenied locale={locale} />
      ) : (
        <>
          <div className="mb-4 rounded-lg border border-line bg-white p-4">
            <div className="text-lg font-black text-navy-900">{staff.fullName || staff.email}</div>
            <div className="text-sm text-muted">{staff.email}</div>
            <div className="mt-1 text-xs text-muted">
              {(hi ? 'भूमिकाएँ' : 'Roles')}: {staff.roleKeys.join(', ') || '—'} · {staff.status}
            </div>
          </div>
          <AssignmentsEditor staff={staff} states={states} exams={exams} locale={locale === 'hi' ? 'hi' : 'en'} />
        </>
      )}
    </Shell>
  );
}
