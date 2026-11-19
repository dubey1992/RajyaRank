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
        <p className="mt-1 max-w-xl text-sm text-muted">
          {L(
            'एक-एक करके सवाल टाइप करें, या एक साथ कई सवालों का ब्लॉक पेस्ट/अपलोड करें। जब चाहें टेस्ट दें और तुरंत स्कोर व व्याख्या पाएँ — किसी विषय से जोड़ने पर गलत जवाब पर रिवीज़न अपने आप शेड्यूल हो जाता है।',
            "Type questions one at a time, or paste/upload a block of many at once. Take it whenever you're ready for an instant score with explanations — link it to a topic and a wrong answer will auto-schedule a revision session for you.",
          )}
        </p>
      </div>
      <MyQuizzesList initial={quizzes ?? []} topics={topics ?? []} initialTopicId={searchParams.topic ?? null} locale={locale} />
    </StudentShell>
  );
}
