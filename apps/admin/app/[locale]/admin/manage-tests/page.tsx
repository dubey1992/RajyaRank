import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { QuickQuestionForm } from '@/components/QuickQuestionForm';
import { QuestionImport } from '@/components/QuestionImport';
import { MockTestsManager } from '@/components/MockTestsManager';
import { TabbedSections, type TabSection } from '@/components/TabbedSections';
import type { TestListItem } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

interface QItem {
  id: string;
  currentVersion: { id: string; type: string; textEn: string | null; textHi: string | null; status: string; difficulty: string; marks: number } | null;
}

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
    canQuestions ? apiFetchServer<QItem[]>('/staff/questions', cookie) : Promise.resolve(null),
    canTests ? apiFetchServer<TestListItem[]>('/staff/tests', cookie) : Promise.resolve(null),
  ]);

  const sections: TabSection[] = [];
  if (canQuestions) {
    const qs = questions ?? [];
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
              {hi ? 'प्रश्न' : 'Questions'} ({qs.length})
            </h2>
            {qs.length === 0 ? (
              <p className="text-sm text-muted">
                {hi
                  ? 'अभी कोई प्रश्न नहीं। बाईं ओर से एक प्रश्न बनाएँ, या CSV बल्क-इम्पोर्ट का उपयोग करें।'
                  : 'No questions yet. Create one on the left, or use CSV bulk-import.'}
              </p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {qs.map((q) => (
                  <li key={q.id} className="rounded-md border border-line bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">{(hi ? q.currentVersion?.textHi : q.currentVersion?.textEn) ?? q.currentVersion?.textEn ?? q.currentVersion?.textHi ?? '—'}</span>
                      <span className="rounded-full bg-line px-2 py-0.5 text-xs font-extrabold">{q.currentVersion?.status}</span>
                    </div>
                    <div className="text-xs text-muted">{q.currentVersion?.type} · {q.currentVersion?.difficulty} · {q.currentVersion?.marks} mark(s)</div>
                  </li>
                ))}
              </ul>
            )}
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
