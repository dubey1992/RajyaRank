import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { QuickQuestionForm } from '@/components/QuickQuestionForm';
import { QuestionImport } from '@/components/QuestionImport';

export const dynamic = 'force-dynamic';

interface QItem {
  id: string;
  currentVersion: { id: string; type: string; textEn: string | null; textHi: string | null; status: string; difficulty: string; marks: number } | null;
}

export default async function QuestionBankPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);

  if (!can(me, 'question.create')) {
    return (
      <Shell me={me} locale={locale} title={hi ? 'प्रश्न बैंक' : 'Question Bank'}>
        <AccessDenied locale={locale} permission="question.create" />
      </Shell>
    );
  }

  const questions = (await apiFetchServer<QItem[]>('/staff/questions', cookies().toString())) ?? [];

  return (
    <Shell me={me} locale={locale} title={hi ? 'प्रश्न बैंक' : 'Question Bank'}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-6">
          <QuickQuestionForm locale={locale} />
          {can(me, 'question.import') ? <QuestionImport locale={locale} /> : null}
        </div>
        <section>
          <h2 className="mb-3 text-lg font-extrabold text-navy-900">
            {hi ? 'प्रश्न' : 'Questions'} ({questions.length})
          </h2>
          {questions.length === 0 ? (
            <p className="text-sm text-muted">
              {hi
                ? 'अभी कोई प्रश्न नहीं। बाईं ओर से एक प्रश्न बनाएँ, या CSV बल्क-इम्पोर्ट का उपयोग करें।'
                : 'No questions yet. Create one on the left, or use CSV bulk-import.'}
            </p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {questions.map((q) => (
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
    </Shell>
  );
}
