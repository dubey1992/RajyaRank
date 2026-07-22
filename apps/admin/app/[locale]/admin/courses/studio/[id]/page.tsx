import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { CourseStudioShell } from '@/components/course-studio/CourseStudioShell';

export const dynamic = 'force-dynamic';

export default async function CourseStudioPage({ params }: { params: { locale: string; id: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'कोर्स स्टूडियो' : 'Course Studio';

  if (!can(me, 'course.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="course.manage" />
      </Shell>
    );
  }

  return (
    <Shell me={me} locale={locale} title={title}>
      <CourseStudioShell
        mode="edit"
        locale={locale}
        isInstitute={!!me.orgId}
        courseId={params.id}
        webPublicUrl={process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000'}
      />
    </Shell>
  );
}
