import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { MyQuizzesList } from '@/components/MyQuizzesList';
import type { CustomTopicView, PersonalQuizView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function MyQuizzesPage({ params, searchParams }: { params: { locale: string }; searchParams: { topic?: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/my-quizzes`)}`);

  const [quizzes, topics] = await Promise.all([
    apiFetchServer<PersonalQuizView[]>('/student/my-quizzes', cookie),
    apiFetchServer<CustomTopicView[]>('/student/study-plan/custom-topics', cookie),
  ]);

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('प्रैक्टिस टेस्ट', 'Practice tests')} hasInstitute={Boolean(me.orgId)}>
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('मेरे प्रैक्टिस टेस्ट', 'My practice tests')}</h1>
        <p className="mt-1 text-sm text-muted">{L('अपने नोट्स से खुद के सवाल बनाएँ और खुद को परखें।', 'Build your own questions from your notes and test yourself.')}</p>
      </div>
      <MyQuizzesList initial={quizzes ?? []} topics={topics ?? []} initialTopicId={searchParams.topic ?? null} locale={locale} />
    </StudentShell>
  );
}
