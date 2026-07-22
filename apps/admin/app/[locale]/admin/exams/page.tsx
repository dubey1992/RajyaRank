import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ExamsManager, type ExamRow } from '@/components/ExamsManager';

export const dynamic = 'force-dynamic';

interface Ref { id: string; code: string; nameHi: string; nameEn: string }

export default async function ExamsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'परीक्षा सूची' : 'Exams & States';

  if (!can(me, 'course.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="course.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [exams, states, examBodies] = await Promise.all([
    // Institution-scoped: an org-scoped actor only gets their own institution's
    // exams here (not the public, platform-wide /exams catalog).
    apiFetchServer<ExamRow[]>('/admin/catalogue/exams', cookie),
    apiFetchServer<Ref[]>('/states', cookie),
    apiFetchServer<Ref[]>('/exam-bodies', cookie),
  ]);

  return (
    <Shell me={me} locale={locale} title={title}>
      <ExamsManager
        initialExams={exams ?? []}
        initialStates={states ?? []}
        initialExamBodies={examBodies ?? []}
        locale={locale}
        orgScoped={!!me.orgId}
      />
    </Shell>
  );
}
