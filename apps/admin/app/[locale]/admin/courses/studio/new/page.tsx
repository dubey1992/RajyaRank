import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { CourseStudioShell } from '@/components/course-studio/CourseStudioShell';

export const dynamic = 'force-dynamic';

interface Ref { id: string; code: string; nameHi: string; nameEn: string }

export default async function NewCourseStudioPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'नया कोर्स स्टूडियो' : 'New Course Studio';

  if (!can(me, 'course.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="course.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [states, exams] = await Promise.all([
    apiFetchServer<Ref[]>('/states', cookie),
    apiFetchServer<Ref[]>('/exams', cookie),
  ]);

  return (
    <Shell me={me} locale={locale} title={title}>
      <CourseStudioShell
        mode="create"
        locale={locale}
        isInstitute={!!me.orgId}
        states={states ?? []}
        exams={exams ?? []}
        webPublicUrl={process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000'}
      />
    </Shell>
  );
}
