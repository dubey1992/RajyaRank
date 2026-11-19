import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { StudyPlanWeekView } from '@/components/StudyPlanWeekView';
import type { CustomTopicView, StudyGoals, StudyPlanAccessStatus, StudyPlanDay } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function StudyPlanPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  // Carries a brand-new student straight back here after signup/login — the
  // WhatsApp-link entry point into this whole flow.
  if (!me) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/study-plan`)}`);

  const [week, goals, topics, accessStatus] = await Promise.all([
    apiFetchServer<StudyPlanDay[]>('/student/study-plan/week', cookie),
    apiFetchServer<StudyGoals>('/student/profile/goals', cookie),
    apiFetchServer<CustomTopicView[]>('/student/study-plan/custom-topics', cookie),
    apiFetchServer<StudyPlanAccessStatus>('/student/study-plan/access-status', cookie),
  ]);

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('स्टडी प्लान', 'Study plan')} hasInstitute={Boolean(me.orgId)}>
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('स्टडी प्लान', 'Study plan')}</h1>
        <p className="mt-1 text-sm text-muted">{L('आपकी दैनिक अध्ययन योजना — प्रगति को ट्रैक करें और कमज़ोर विषयों पर ध्यान दें।', 'Your day-by-day study plan — track progress and focus on weak topics.')}</p>
      </div>
      {week ? (
        <StudyPlanWeekView
          initial={week}
          initialGoals={goals}
          initialTopics={topics ?? []}
          initialAccessStatus={accessStatus}
          locale={locale}
        />
      ) : (
        <p className="text-sm text-muted">{L('योजना लोड नहीं हो सकी।', 'Could not load your plan.')}</p>
      )}
    </StudentShell>
  );
}
