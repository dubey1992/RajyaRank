import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { DashboardResponse, WeakTopic } from '@rajyarank/contracts';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { StudentShell } from '@/components/StudentShell';
import { ExamCountdown } from '@/components/ExamCountdown';

export const dynamic = 'force-dynamic';

function initialsOf(name: string | null): string {
  if (!name) return 'S';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'S';
}
const fmtHm = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const data = await apiFetchServer<DashboardResponse>('/student/dashboard', cookie);
  if (!data) redirect(`/${locale}/login`);
  if (!data.onboarded) redirect(`/${locale}/onboarding`);

  const weakTopics = (await apiFetchServer<WeakTopic[]>('/student/weak-topics', cookie)) ?? [];

  const name = data.greetingName ?? L('विद्यार्थी', 'Student');
  const initials = initialsOf(data.greetingName);
  const targetLabel = data.targetExam ? (hi ? data.targetExam.nameHi : data.targetExam.nameEn) : L('लक्ष्य परीक्षा सेट करें', 'Set a target exam');

  const resumeLesson = data.continueWatching[0]?.lessonId ?? data.todayPlan[0]?.lessonId;
  const goalPct = data.weeklyGoal.targetMinutes > 0 ? Math.min(100, Math.round((data.weeklyGoal.doneMinutes / data.weeklyGoal.targetMinutes) * 100)) : 0;
  const CIRC = 2 * Math.PI * 54;

  // Weekday letters for the last 7 days (index 6 = today), aligned to streakWeek.
  const weekdayLetters = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
  });

  const stats: { icon: string; value: string; label: string; tone: string }[] = [
    { icon: '⏱', value: fmtHm(data.studyTimeMinutes), label: L('कुल अध्ययन समय', 'Total study time'), tone: 'bg-orange-100 text-orange-600' },
    { icon: '🎯', value: `${data.stats.coursePercent}%`, label: L('कोर्स प्रगति', 'Course progress'), tone: 'bg-teal-100 text-teal-600' },
    { icon: '🏆', value: data.avgTestScorePercent != null ? `${data.avgTestScorePercent}%` : '—', label: L('औसत टेस्ट स्कोर', 'Average test score'), tone: 'bg-navy-100 text-navy-800' },
    { icon: '🔥', value: L(`${data.studyStreakDays} दिन`, `${data.studyStreakDays} days`), label: L('अध्ययन स्ट्रीक', 'Study streak'), tone: 'bg-[#f1e9ff] text-[#7c3aed]' },
  ];

  const pillTone: Record<string, string> = {
    VIDEO: 'bg-orange-100 text-orange-600', QUIZ: 'bg-navy-100 text-navy-800', TEST: 'bg-navy-100 text-navy-800',
    REVISION: 'bg-[#f1e9ff] text-[#7c3aed]', CURRENT: 'bg-teal-100 text-teal-600', DOCUMENT: 'bg-teal-100 text-teal-600',
  };

  return (
    <StudentShell locale={locale} name={name} initials={initials} target={targetLabel} activeEntitlementEndsAt={data.activeEntitlementEndsAt}>
      {/* Page head */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('शुभ संध्या', 'Good evening')}, {name} 👋</h1>
          <p className="mt-1 text-sm text-muted">{L('आज के लिए आपकी व्यक्तिगत अध्ययन योजना।', 'Here is your personalised study plan for today.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/current-affairs`} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-line bg-white px-4 text-xs font-extrabold text-navy-900 transition hover:-translate-y-0.5">
            {L('दैनिक करंट अफेयर्स', 'Daily Current Affairs')}
          </Link>
          {resumeLesson ? (
            <Link href={`/${locale}/learn/${resumeLesson}`} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-extrabold text-white shadow-[0_9px_20px_rgba(245,116,23,0.2)] transition hover:-translate-y-0.5 hover:bg-orange-600">
              ▶ {L('पढ़ाई जारी रखें', 'Continue Learning')}
            </Link>
          ) : null}
        </div>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s) => (
          <article key={s.label} className="flex items-center gap-3.5 rounded-[18px] border border-line bg-white p-4 shadow-[0_5px_18px_rgba(6,29,49,0.035)]">
            <span className={`grid h-[46px] w-[46px] flex-none place-items-center rounded-[15px] text-xl ${s.tone}`}>{s.icon}</span>
            <div className="min-w-0">
              <strong className="block text-[23px] font-black tracking-tight text-navy-950">{s.value}</strong>
              <span className="text-[10.5px] font-bold text-muted">{s.label}</span>
            </div>
          </article>
        ))}
      </section>

      {/* Main grid */}
      <div className="mt-[18px] grid gap-[18px] lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        {/* Left column */}
        <div className="grid gap-[18px]">
          {/* Hero panel */}
          <article className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-navy-950 to-navy-800 p-6 text-white">
            <span aria-hidden className="pointer-events-none absolute -right-28 -top-24 h-72 w-72 rounded-full border-[50px] border-white/[0.035]" />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs font-bold text-[#c3d7e3]">📅 {L('लक्ष्य परीक्षा', 'Target exam')}: {targetLabel}</div>
              <h2 className="mt-3 max-w-xl text-[28px] font-black leading-[1.13] tracking-tight">{L('आपकी तैयारी सही दिशा में है। गति बनाए रखें।', 'Your preparation is on track. Keep the momentum going.')}</h2>
              <p className="mt-2 max-w-xl text-[12.5px] text-[#c8d9e4]">{L('साप्ताहिक लक्ष्य से आगे रहने के लिए आज की योजना पूरी करें।', "Complete today's plan to stay ahead of your weekly target.")}</p>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <small className="text-[9px] font-black uppercase tracking-wide text-[#bdd2df]">{L('परीक्षा में शेष', 'Exam countdown')}</small>
                  <div className="mt-1.5">
                    {data.examDate ? (
                      <ExamCountdown iso={data.examDate} locale={locale} />
                    ) : data.examCountdownDays != null ? (
                      <div className="min-w-[56px] rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-center">
                        <strong className="block text-[17px]">{data.examCountdownDays}</strong>
                        <small className="text-[8.5px] uppercase text-[#bdd2df]">{L('दिन', 'Days')}</small>
                      </div>
                    ) : (
                      <span className="text-xs text-[#bdd2df]">{L('परीक्षा तिथि सेट नहीं है', 'No exam date set')}</span>
                    )}
                  </div>
                </div>
                <Link href={`/${locale}/study-plan`} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-white px-4 text-xs font-extrabold text-navy-900 transition hover:-translate-y-0.5">
                  🗺 {L('स्टडी प्लान देखें', 'View study plan')}
                </Link>
              </div>
            </div>
          </article>

          {/* Today's plan */}
          <article className="rounded-[20px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[19px] font-black tracking-tight text-navy-950">{L('आज की अध्ययन योजना', "Today's study plan")}</h2>
                <p className="mt-0.5 text-[11px] text-muted">{L(`${data.todayPlan.length} में से चुनें`, `${data.todayPlan.length} suggested lessons`)}</p>
              </div>
            </div>
            {data.todayPlan.length === 0 ? (
              <p className="text-sm text-muted">{L('अभी कोई सुझाव नहीं। कोर्स चुनें।', 'No suggestions yet. Pick a course.')}</p>
            ) : (
              <div className="grid gap-2.5">
                {data.todayPlan.map((l, i) => (
                  <div key={l.lessonId} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[15px] border border-[#edf2f5] bg-[#fbfcfd] p-3">
                    <span className="grid h-7 w-7 place-items-center rounded-[9px] border border-[#cddbe3] bg-white text-[11px] font-black text-navy-900">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-extrabold text-ink">{hi ? l.titleHi : l.titleEn}</div>
                      <div className="mt-0.5 text-[10px] text-muted">{L(l.freePreview ? 'मुफ़्त प्रीव्यू' : 'कोर्स में शामिल', l.freePreview ? 'Free preview' : 'Included in course')}</div>
                    </div>
                    <Link href={`/${locale}/learn/${l.lessonId}`} className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black ${pillTone[l.kind] ?? 'bg-navy-100 text-navy-800'}`}>{l.kind}</span>
                      <span className="text-[11px] font-extrabold text-orange-600">{l.freePreview ? L('खोलें', 'Open') : L('अनलॉक', 'Unlock')} →</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </article>

          {/* Continue learning */}
          {data.continueWatching.length ? (
            <article>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[19px] font-black tracking-tight text-navy-950">{L('पढ़ाई जारी रखें', 'Continue learning')}</h2>
                <Link href={`/${locale}/my-courses`} className="text-[11px] font-black text-orange-600">{L('सभी देखें', 'View all')}</Link>
              </div>
              <div className="grid gap-2.5">
                {data.continueWatching.map((c) => (
                  <div key={c.lessonId} className="grid grid-cols-[110px_1fr_auto] items-center gap-4 rounded-[18px] border border-line bg-white p-4">
                    <div className="relative grid h-[74px] place-items-center overflow-hidden rounded-[14px] bg-gradient-to-br from-navy-800 to-teal-600 text-white">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-orange-500">▶</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold text-navy-900">{hi ? c.titleHi : c.titleEn}</h3>
                      <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[#eaf0f3]">
                        <span className="block h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400" style={{ width: `${c.percentComplete}%` }} />
                      </div>
                      <div className="mt-1 text-[9px] text-muted">{c.percentComplete}% {L('पूर्ण', 'complete')}</div>
                    </div>
                    <Link href={`/${locale}/learn/${c.lessonId}`} className="inline-flex min-h-[34px] items-center rounded-xl bg-orange-500 px-3 text-[10.5px] font-extrabold text-white transition hover:bg-orange-600">
                      {L('जारी रखें', 'Resume')}
                    </Link>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </div>

        {/* Right stack */}
        <aside className="grid content-start gap-[18px] sm:grid-cols-2 lg:grid-cols-1">
          {/* Weekly goal ring */}
          <article className="rounded-[20px] border border-line bg-white p-5 text-center shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
            <div className="mb-1 text-left">
              <h3 className="text-base font-black tracking-tight text-navy-950">{L('साप्ताहिक लक्ष्य', 'Weekly goal')}</h3>
              <p className="text-[11px] text-muted">{fmtHm(data.weeklyGoal.doneMinutes)} / {fmtHm(data.weeklyGoal.targetMinutes)}</p>
            </div>
            <div className="relative mx-auto my-3 h-[146px] w-[146px]">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="54" fill="none" strokeWidth="11" stroke="#edf3f6" />
                <circle cx="60" cy="60" r="54" fill="none" strokeWidth="11" strokeLinecap="round" stroke="#f57417" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - goalPct / 100)} />
              </svg>
              <div className="absolute inset-0 grid place-content-center">
                <strong className="text-[31px] font-black tracking-tighter text-navy-950">{goalPct}%</strong>
                <span className="text-[9.5px] font-black text-muted">{L('पूर्ण', 'COMPLETED')}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[11px] bg-[#f7f9fb] px-1 py-2.5"><strong className="block text-xs">{data.stats.lessonsCompleted}</strong><small className="text-[8.5px] text-muted">{L('पाठ', 'Lessons')}</small></div>
              <div className="rounded-[11px] bg-[#f7f9fb] px-1 py-2.5"><strong className="block text-xs">{data.testsAttempted}</strong><small className="text-[8.5px] text-muted">{L('टेस्ट', 'Tests')}</small></div>
              <div className="rounded-[11px] bg-[#f7f9fb] px-1 py-2.5"><strong className="block text-xs">{weakTopics.length}</strong><small className="text-[8.5px] text-muted">{L('रिवीज़न', 'Revise')}</small></div>
            </div>
          </article>

          {/* Streak */}
          <article className="rounded-[20px] border border-[#ffe0bf] bg-gradient-to-br from-[#fff7eb] to-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🔥</span>
                <div>
                  <strong className="block text-[23px] font-black text-orange-600">{L(`${data.studyStreakDays} दिन`, `${data.studyStreakDays}-day`)}</strong>
                  <div className="text-[9.5px] text-muted">{L('रोज़ पढ़ते रहें', 'Keep learning every day')}</div>
                </div>
              </div>
            </div>
            <div className="mt-3.5 grid grid-cols-7 gap-1.5">
              {data.streakWeek.map((on, i) => (
                <div key={i} className="text-center text-[8px] text-muted">
                  {weekdayLetters[i]}
                  <i className={`mx-auto mt-1.5 grid h-[27px] w-[27px] place-items-center rounded-[9px] text-[10px] font-black not-italic ${on ? 'bg-orange-500 text-white' : 'bg-[#f2f5f7] text-[#8ba0ae]'} ${i === 6 ? 'ring-2 ring-orange-500/20' : ''}`}>{on ? '✓' : ''}</i>
                </div>
              ))}
            </div>
          </article>

          {/* Needs attention */}
          {weakTopics.length ? (
            <article className="rounded-[20px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black tracking-tight text-navy-950">{L('ध्यान देने योग्य', 'Needs attention')}</h3>
                  <p className="text-[11px] text-muted">{L('इस माह के कमज़ोर विषय', 'Your weakest topics this month')}</p>
                </div>
                <Link href={`/${locale}/revision`} className="text-[11px] font-black text-orange-600">{L('रिवाइज़', 'Revise')}</Link>
              </div>
              <div className="grid gap-3">
                {weakTopics.slice(0, 3).map((w) => (
                  <div key={`${w.kind}:${w.id}`}>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <strong>{hi ? w.nameHi : w.nameEn}</strong>
                      <small className="text-muted">{w.accuracy}%</small>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                      <span className={`block h-full rounded-full ${w.accuracy < 50 ? 'bg-danger' : w.accuracy < 75 ? 'bg-warning' : 'bg-teal-600'}`} style={{ width: `${w.accuracy}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </aside>
      </div>
    </StudentShell>
  );
}
