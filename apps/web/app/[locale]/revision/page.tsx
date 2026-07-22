import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { MeResponse, WeakTopic } from '@rajyarank/contracts';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { StudentShell } from '@/components/StudentShell';

export const dynamic = 'force-dynamic';

interface RevisionResponse {
  bookmarked: { lessonId: string; titleHi: string; titleEn: string }[];
  inProgress: { lessonId: string; titleHi: string; titleEn: string; percentComplete: number }[];
}

function initialsOf(name: string | null): string {
  if (!name) return 'S';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'S';
}

export default async function RevisionPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await apiFetchServer<MeResponse>('/auth/me', cookie);
  if (!me) redirect(`/${locale}/login`);

  const [weak, revision] = await Promise.all([
    apiFetchServer<WeakTopic[]>('/student/weak-topics', cookie),
    apiFetchServer<RevisionResponse>('/student/revision', cookie),
  ]);
  const weakTopics = weak ?? [];
  const bookmarked = revision?.bookmarked ?? [];
  const inProgress = revision?.inProgress ?? [];

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('रिवीज़न केंद्र', 'Revision centre')}>
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('रिवीज़न', 'Revision')}</h1>
        <p className="mt-1 text-sm text-muted">{L('दोबारा पढ़ने की हर चीज़ एक ही जगह पर।', 'Everything you need to revisit, organised in one place.')}</p>
      </div>

      {/* Weak topics */}
      <section className="mb-6">
        <h2 className="mb-3 text-[19px] font-black tracking-tight text-navy-950">{L('कमज़ोर विषय', 'Weak topics')}</h2>
        {weakTopics.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई डेटा नहीं — कुछ टेस्ट दें।', 'No data yet — attempt a few tests.')}</p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {weakTopics.map((w) => (
              <article key={`${w.kind}:${w.id}`} className="rounded-[15px] border border-line bg-white p-4">
                <div className="flex items-center justify-between text-[12px]">
                  <span>
                    <strong className="text-ink">{hi ? w.nameHi : w.nameEn}</strong>
                    <span className="ml-1.5 rounded-full bg-surface-soft px-1.5 py-0.5 text-[8.5px] font-black uppercase text-muted">
                      {w.kind === 'subject' ? L('विषय', 'Subject') : L('टॉपिक', 'Topic')}
                    </span>
                  </span>
                  <span className={`font-extrabold ${w.accuracy < 50 ? 'text-danger' : w.accuracy < 75 ? 'text-warning' : 'text-success'}`}>{w.accuracy}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <span className={`block h-full rounded-full ${w.accuracy < 50 ? 'bg-danger' : w.accuracy < 75 ? 'bg-warning' : 'bg-teal-600'}`} style={{ width: `${w.accuracy}%` }} />
                </div>
                <div className="mt-1.5 text-[10px] text-muted">{w.correct}/{w.total} {L('सही', 'correct')}</div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* In progress */}
      {inProgress.length ? (
        <section className="mb-6">
          <h2 className="mb-3 text-[19px] font-black tracking-tight text-navy-950">{L('जारी पाठ', 'In-progress lessons')}</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {inProgress.map((l) => (
              <Link key={l.lessonId} href={`/${locale}/learn/${l.lessonId}`} className="rounded-[15px] border border-line bg-white p-4 transition hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <strong className="truncate text-[12.5px] text-navy-900">{hi ? l.titleHi : l.titleEn}</strong>
                  <span className="text-[11px] text-muted">{l.percentComplete}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-orange-500" style={{ width: `${l.percentComplete}%` }} /></div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Bookmarked */}
      <section>
        <h2 className="mb-3 text-[19px] font-black tracking-tight text-navy-950">{L('सेव किए गए पाठ', 'Saved lessons')}</h2>
        {bookmarked.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई बुकमार्क नहीं। पाठ में बुकमार्क दबाएँ।', 'No bookmarks yet. Bookmark a lesson to save it here.')}</p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarked.map((l) => (
              <Link key={l.lessonId} href={`/${locale}/learn/${l.lessonId}`} className="flex items-center gap-3 rounded-[15px] border border-line bg-white p-4 transition hover:-translate-y-0.5">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-orange-100 text-orange-600">🔖</span>
                <strong className="truncate text-[12.5px] text-navy-900">{hi ? l.titleHi : l.titleEn}</strong>
              </Link>
            ))}
          </div>
        )}
      </section>
    </StudentShell>
  );
}
