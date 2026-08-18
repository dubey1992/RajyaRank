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

export const dynamic = 'force-dynamic';

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

  const questions = (await apiFetchServer<QuestionItem[]>('/staff/questions', cookies().toString())) ?? [];

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
          <QuestionBankBrowser
            questions={questions}
            locale={locale}
            canSubmit={can(me, 'question.create')}
            canReview={can(me, 'content.review')}
            canApprove={can(me, 'content.approve')}
            canDelete={can(me, 'content.archive')}
          />
        </section>
      </div>
    </Shell>
  );
}
