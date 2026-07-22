import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { CoursesManager, type CourseRow } from '@/components/CoursesManager';

export const dynamic = 'force-dynamic';

export default async function CoursesPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'कोर्स प्रबंधन' : 'Course Management';

  if (!can(me, 'course.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="course.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const courses = await apiFetchServer<CourseRow[]>('/admin/courses', cookie);

  return (
    <Shell me={me} locale={locale} title={title}>
      <CoursesManager initial={courses ?? []} locale={locale} />
    </Shell>
  );
}
