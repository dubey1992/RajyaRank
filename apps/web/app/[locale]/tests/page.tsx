import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { StudentTestListItem } from '@rajyarank/contracts';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';

export const dynamic = 'force-dynamic';

const TYPE_META: Record<string, { icon: string; tone: string }> = {
  FULL_MOCK: { icon: '📝', tone: 'bg-navy-100 text-navy-800' },
  CHAPTER: { icon: '🧮', tone: 'bg-orange-100 text-orange-600' },
  SUBJECT: { icon: '📚', tone: 'bg-teal-100 text-teal-600' },
  PREVIOUS_YEAR: { icon: '🕘', tone: 'bg-[#f1e9ff] text-[#7c3aed]' },
  PRACTICE: { icon: '🧠', tone: 'bg-teal-100 text-teal-600' },
};

export default async function TestsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login`);
  const tests = (await apiFetchServer<StudentTestListItem[]>('/student/tests', cookie)) ?? [];

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('टेस्ट और अभ्यास', 'Tests & Practice')}>
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('टेस्ट और अभ्यास', 'Tests & Practice')}</h1>
        <p className="mt-1 text-sm text-muted">{L('नियमित अभ्यास करें और जानें कि कहाँ सुधार करना है।', 'Practise regularly and understand exactly where to improve.')}</p>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-[20px] border border-line bg-white p-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-surface-soft text-2xl">🧪</div>
          <h3 className="mt-3.5 text-[15px] font-black text-navy-900">{L('अभी कोई टेस्ट नहीं', 'No tests yet')}</h3>
          <p className="mx-auto mt-1 max-w-sm text-[10.5px] text-muted">{L('जैसे ही आपके कोर्स में टेस्ट प्रकाशित होंगे, वे यहाँ दिखेंगे।', 'Published tests for your course will appear here.')}</p>
        </div>
      ) : (
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => {
            const meta = TYPE_META[t.type] ?? { icon: '📝', tone: 'bg-navy-100 text-navy-800' };
            return (
              <article key={t.testVersionId} className="relative overflow-hidden rounded-[18px] border border-line bg-white p-[18px] shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
                <span className={`grid h-11 w-11 place-items-center rounded-[14px] text-xl ${meta.tone}`}>{meta.icon}</span>
                <h3 className="mt-3.5 text-[15px] font-black text-navy-900">{hi ? t.titleHi : t.titleEn}</h3>
                <p className="mt-1 text-[10.5px] text-muted">{t.type.replace(/_/g, ' ')}</p>
                <div className="my-3.5 grid grid-cols-3 gap-1.5">
                  <div className="rounded-[10px] bg-[#f7f9fb] px-1 py-2 text-center"><strong className="block text-[11px]">{t.questionCount}</strong><small className="text-[8px] text-muted">{L('प्रश्न', 'Questions')}</small></div>
                  <div className="rounded-[10px] bg-[#f7f9fb] px-1 py-2 text-center"><strong className="block text-[11px]">{t.durationMinutes}m</strong><small className="text-[8px] text-muted">{L('अवधि', 'Duration')}</small></div>
                  <div className="rounded-[10px] bg-[#f7f9fb] px-1 py-2 text-center"><strong className="block text-[11px]">{L('हिं/EN', 'Hi/EN')}</strong><small className="text-[8px] text-muted">{L('भाषा', 'Language')}</small></div>
                </div>
                {t.completedAttemptId ? (
                  <Link
                    href={`/${locale}/tests/${t.testVersionId}/review?attemptId=${t.completedAttemptId}`}
                    className="block w-full rounded-xl border border-line bg-white py-2.5 text-center text-[11px] font-extrabold text-navy-900 transition hover:bg-surface-soft"
                  >
                    {L('परिणाम देखें', 'View results')}
                  </Link>
                ) : (
                  <Link href={`/${locale}/tests/${t.testVersionId}`} className="block w-full rounded-xl bg-orange-500 py-2.5 text-center text-[11px] font-extrabold text-white transition hover:bg-orange-600">
                    {L('टेस्ट शुरू करें', 'Start test')}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}
