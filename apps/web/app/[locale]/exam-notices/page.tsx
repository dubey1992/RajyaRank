import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';

export const dynamic = 'force-dynamic';

interface ExamNotice {
  id: string;
  noticeNumber: string;
  publishedDate: string;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
}

export default async function ExamNoticesPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login`);

  const items = (await apiFetchServer<ExamNotice[]>('/student/exam-notices', cookie)) ?? [];

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('परीक्षा सूचनाएँ', 'Exam Notices')}>
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('परीक्षा सूचनाएँ', 'Exam Notices')}</h1>
        <p className="mt-1 text-sm text-muted">{L('आपकी लक्ष्य परीक्षा से संबंधित आधिकारिक अपडेट, समीक्षा के बाद प्रकाशित।', 'Official updates about your target exam, published after academic review.')}</p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">
          {L('अभी कोई सूचना नहीं। लक्ष्य परीक्षा सेट करें या बाद में देखें।', 'No notices yet. Set your target exam, or check back later.')}
        </p>
      ) : (
        <ul className="grid gap-4">
          {items.map((n) => (
            <li key={n.id} className="rounded-lg border border-line bg-white p-5">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-navy-100 px-2 py-0.5 font-extrabold text-navy-900">{n.noticeNumber}</span>
                <span className="text-muted">{new Date(n.publishedDate).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}</span>
              </div>
              <h2 className="text-lg font-black text-navy-900">{hi ? n.titleHi : n.titleEn}</h2>
              <p className="mt-1 text-sm text-ink">{hi ? n.bodyHi : n.bodyEn}</p>
            </li>
          ))}
        </ul>
      )}
    </StudentShell>
  );
}
