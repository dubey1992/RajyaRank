import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { DoubtComposer } from './composer';
import type { DoubtView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = {
  OPEN: 'bg-[#fff7d6] text-[#966700]',
  ASSIGNED: 'bg-orange-100 text-warning',
  ANSWERED: 'bg-teal-100 text-teal-600',
  RESOLVED: 'bg-teal-100 text-success',
  REOPENED: 'bg-orange-100 text-danger',
  CLOSED: 'bg-[#eef2f4] text-muted',
};

export default async function DoubtsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login`);
  const doubts = (await apiFetchServer<DoubtView[]>('/student/doubts', cookie)) ?? [];

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('मेरे सवाल', 'My Doubts')}>
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('मेरे सवाल', 'My Doubts')}</h1>
        <p className="mt-1 text-sm text-muted">{L('अपने शिक्षकों से पूछें और हर उत्तर को ट्रैक करें।', 'Ask your educators and track every response.')}</p>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Doubt list */}
        <section>
          {doubts.length === 0 ? (
            <div className="rounded-[18px] border border-line bg-white p-10 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-surface-soft text-2xl">💬</div>
              <h3 className="mt-3.5 text-[15px] font-black text-navy-900">{L('अभी कोई सवाल नहीं', 'No doubts yet')}</h3>
              <p className="mx-auto mt-1 max-w-xs text-[10.5px] text-muted">{L('दाईं ओर से अपना पहला सवाल पूछें।', 'Ask your first doubt from the form on the right.')}</p>
            </div>
          ) : (
            <div className="grid gap-2.5">
              {doubts.map((d) => (
                <article key={d.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-[16px] border border-line bg-white p-4">
                  <span className="grid h-[41px] w-[41px] place-items-center rounded-[13px] bg-[#f1e9ff] text-[#7c3aed]">❓</span>
                  <div className="min-w-0">
                    <h3 className="text-[12.5px] font-black text-navy-900">{d.bodyText.slice(0, 140)}</h3>
                    {d.replies.map((r) => (
                      <p key={r.id} className="mt-2 rounded-md bg-surface-soft p-2 text-[11px] text-ink">↳ {r.bodyText}</p>
                    ))}
                    <div className="mt-2 flex gap-2 text-[8.5px] text-muted">
                      <span>{new Date(d.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}</span>
                      {d.replies.length ? <><span>•</span><span>{d.replies.length} {L('उत्तर', 'replies')}</span></> : null}
                    </div>
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[8.5px] font-black ${STATUS_TONE[d.status] ?? 'bg-line'}`}>{d.status}</span>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Ask a doubt */}
        <aside className="rounded-[18px] border border-line bg-white p-5 shadow-[0_7px_22px_rgba(6,29,49,0.04)] lg:sticky lg:top-[94px] lg:self-start">
          <h2 className="mb-3 text-base font-black tracking-tight text-navy-950">{L('नया सवाल पूछें', 'Ask a new doubt')}</h2>
          <DoubtComposer locale={locale} />
        </aside>
      </div>
    </StudentShell>
  );
}
