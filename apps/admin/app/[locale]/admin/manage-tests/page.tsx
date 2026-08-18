import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { QuickQuestionForm } from '@/components/QuickQuestionForm';
import { QuestionImport } from '@/components/QuestionImport';
import { QuestionBankBrowser, type QuestionItem } from '@/components/QuestionBankBrowser';
import { MockTestsManager } from '@/components/MockTestsManager';
import { TabbedSections, type TabSection } from '@/components/TabbedSections';
import type { TestListItem } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

/** Question bank + mock tests, merged into one page for anyone who'd
 *  otherwise see both as separate nav entries (see showsMergedTests in
 *  Shell.tsx). */
export default async function ManageTestsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'टेस्ट प्रबंधन' : 'Manage Tests';

  const canQuestions = can(me, 'question.create');
  const canTests = can(me, 'test.create') || can(me, 'content.approve');
  if (!canQuestions && !canTests) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="question.create" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [questions, tests] = await Promise.all([
    canQuestions ? apiFetchServer<QuestionItem[]>('/staff/questions', cookie) : Promise.resolve(null),
    canTests ? apiFetchServer<TestListItem[]>('/staff/tests', cookie) : Promise.resolve(null),
  ]);

  const sections: TabSection[] = [];
  if (canQuestions) {
    // Same browser as the standalone /admin/question-bank page (Course ->
    // Questions grouping + Submit/Start review/Approve) — this tab used to
    // carry its own stale flat list with no review actions at all.
    sections.push({
      key: 'questions',
      label: hi ? 'प्रश्न बैंक' : 'Question Bank',
      content: (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="grid gap-6">
            <QuickQuestionForm locale={locale} />
            {can(me, 'question.import') ? <QuestionImport locale={locale} /> : null}
          </div>
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-navy-900">
              {hi ? 'प्रश्न' : 'Questions'} ({(questions ?? []).length})
            </h2>
            <QuestionBankBrowser
              questions={questions ?? []}
              locale={locale}
              canSubmit={can(me, 'question.create')}
              canReview={can(me, 'content.review')}
              canApprove={can(me, 'content.approve')}
              canDelete={can(me, 'content.archive')}
            />
          </section>
        </div>
      ),
    });
  }
  if (canTests) {
    sections.push({
      key: 'mock-tests',
      label: hi ? 'मॉक टेस्ट' : 'Mock Tests',
      content: <MockTestsManager initialTests={tests ?? []} me={me} locale={locale} />,
    });
  }

  return (
    <Shell me={me} locale={locale} title={title}>
      <TabbedSections sections={sections} />
    </Shell>
  );
}
