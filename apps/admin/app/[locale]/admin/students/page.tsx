import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { StudentsManager } from '@/components/StudentsManager';
import type { StudentListItem } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function StudentsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'छात्र' : 'Students';

  if (!can(me, 'user.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="user.manage" />
      </Shell>
    );
  }

  const students = (await apiFetchServer<StudentListItem[]>('/admin/students', cookies().toString())) ?? [];

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'अपने संस्थान के छात्रों को नामांकित व प्रबंधित करें। नामांकित छात्र अपने फ़ोन OTP से लॉगिन करते हैं।'
          : 'Enroll and manage your institution’s students. Enrolled students sign in with their phone OTP.'}
      </p>
      <StudentsManager initial={students} locale={locale} canDisable={can(me, 'user.disable')} />
    </Shell>
  );
}
