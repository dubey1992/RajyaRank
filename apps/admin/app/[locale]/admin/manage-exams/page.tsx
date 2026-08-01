import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ExamsManager, type ExamRow } from '@/components/ExamsManager';
import { OfficialNoticesManager } from '@/components/OfficialNoticesManager';
import { TabbedSections, type TabSection } from '@/components/TabbedSections';
import type { OfficialNoticeView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

interface Ref {
  id: string;
  code: string;
  nameHi: string;
  nameEn: string;
}

/** Exam/state catalogue + official notices, merged into one page for anyone
 *  who'd otherwise see both as separate nav entries (see showsMergedExams in
 *  Shell.tsx). */
export default async function ManageExamsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'परीक्षा प्रबंधन' : 'Manage Exams';

  const canExams = can(me, 'course.manage');
  const canMake = can(me, 'content.create');
  const canCheck = can(me, 'content.review');
  const canNotices = canMake || canCheck;
  if (!canExams && !canNotices) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="course.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [exams, states, examBodies, notices, noticeExams] = await Promise.all([
    canExams ? apiFetchServer<ExamRow[]>('/admin/catalogue/exams', cookie) : Promise.resolve(null),
    canExams ? apiFetchServer<Ref[]>('/states', cookie) : Promise.resolve(null),
    canExams ? apiFetchServer<Ref[]>('/exam-bodies', cookie) : Promise.resolve(null),
    canNotices ? apiFetchServer<OfficialNoticeView[]>('/admin/official-notices', cookie) : Promise.resolve(null),
    canNotices ? apiFetchServer<Ref[]>('/admin/catalogue/exams', cookie) : Promise.resolve(null),
  ]);

  const sections: TabSection[] = [];
  if (canExams) {
    sections.push({
      key: 'exams',
      label: hi ? 'परीक्षाएँ' : 'Exams & States',
      content: (
        <ExamsManager
          initialExams={exams ?? []}
          initialStates={states ?? []}
          initialExamBodies={examBodies ?? []}
          locale={locale}
          orgScoped={!!me.orgId}
        />
      ),
    });
  }
  if (canNotices) {
    sections.push({
      key: 'notices',
      label: hi ? 'आधिकारिक सूचनाएँ' : 'Official Notices',
      content: (
        <>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            {hi
              ? 'एक आधिकारिक परीक्षा-निकाय सूचना दर्ज करें, प्रभावित कॉन्सेप्ट टैग करें, फिर समीक्षा व अनुमोदन के बाद यह परीक्षा कैलेंडर अपडेट करती है और लक्षित छात्रों को सूचित करती है।'
              : 'Enter an official exam-body notice, tag the concepts it affects, then after review and approval it updates the exam calendar and notifies targeted students.'}
          </p>
          <OfficialNoticesManager initial={notices ?? []} initialExams={noticeExams ?? []} canMake={canMake} canCheck={canCheck} locale={locale} />
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
