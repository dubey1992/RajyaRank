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
        // NEXT_PUBLIC_ deliberately, not WEB_PUBLIC_URL — same fix as
        // apps/web/app/robots.ts: Amplify's WEB_COMPUTE platform doesn't
        // reliably propagate app-level env vars into the SSR runtime for
        // monorepo builds, so this must be build-time inlined instead.
        webPublicUrl={process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}
      />
    </Shell>
  );
}
