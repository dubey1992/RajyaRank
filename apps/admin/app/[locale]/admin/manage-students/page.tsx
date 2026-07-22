import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { StudentsManager } from '@/components/StudentsManager';
import { StudentPaymentsManager } from '@/components/StudentPaymentsManager';
import { TabbedSections, type TabSection } from '@/components/TabbedSections';
import type { StudentListItem, AcademicOrderView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

/** Students + their payment ledger, merged into one page for anyone who'd
 *  otherwise see both as separate nav entries (see showsMergedStudents in
 *  Shell.tsx). */
export default async function ManageStudentsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'छात्र प्रबंधन' : 'Manage Students';

  const canStudents = can(me, 'user.manage');
  const canPayments = can(me, 'course.manage');
  if (!canStudents && !canPayments) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="user.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [students, orders] = await Promise.all([
    canStudents ? apiFetchServer<StudentListItem[]>('/admin/students', cookie) : Promise.resolve(null),
    canPayments ? apiFetchServer<AcademicOrderView[]>('/academic/orders', cookie) : Promise.resolve(null),
  ]);

  const sections: TabSection[] = [];
  if (canStudents) {
    sections.push({
      key: 'students',
      label: hi ? 'छात्र' : 'Students',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi
              ? 'अपने संस्थान के छात्रों को नामांकित व प्रबंधित करें। नामांकित छात्र अपने फ़ोन OTP से लॉगिन करते हैं।'
              : 'Enroll and manage your institution’s students. Enrolled students sign in with their phone OTP.'}
          </p>
          <StudentsManager initial={students ?? []} locale={locale} canDisable={can(me, 'user.disable')} />
        </>
      ),
    });
  }
  if (canPayments && orders) {
    sections.push({
      key: 'payments',
      label: hi ? 'भुगतान' : 'Payments',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi ? 'एक ही लेजर में आंतरिक, बाहरी और प्रायोजित पहुँच।' : 'Internal, external and sponsored access in a single ledger.'}
          </p>
          <StudentPaymentsManager orders={orders} locale={locale} />
        </>
      ),
    });
  }

  return (
    <Shell me={me} locale={locale} title={title}>
      <TabbedSections sections={sections} />
    </Shell>
  );
}
