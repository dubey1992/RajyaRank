import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { StudentPyqPaperListItem } from '@rajyarank/contracts';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { PyqDownloadButton } from '@/components/PyqDownloadButton';

export const dynamic = 'force-dynamic';

export default async function PyqPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login`);
  const papers = (await apiFetchServer<StudentPyqPaperListItem[]>('/student/pyq-papers', cookie)) ?? [];

  return (
    <StudentShell
      locale={locale}
      name={me.displayName ?? L('विद्यार्थी', 'Student')}
      initials={initialsOf(me.displayName)}
      target={L('पिछले वर्ष के प्रश्न', 'Previous Year Questions')}
      hasInstitute={Boolean(me.orgId)}
    >
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('पिछले वर्ष के प्रश्न', 'Previous Year Questions')}</h1>
        <p className="mt-1 text-sm text-muted">{L('असली परीक्षा पेपर देखें और डाउनलोड करें।', 'View and download real past exam papers.')}</p>
      </div>

      {papers.length === 0 ? (
        <div className="rounded-[20px] border border-line bg-white p-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-surface-soft text-2xl">🕘</div>
          <h3 className="mt-3.5 text-[15px] font-black text-navy-900">{L('अभी कोई पेपर नहीं', 'No papers yet')}</h3>
          <p className="mx-auto mt-1 max-w-sm text-[10.5px] text-muted">{L('जैसे ही नए पिछले वर्ष के पेपर प्रकाशित होंगे, वे यहाँ दिखेंगे।', 'New previous-year papers will appear here once published.')}</p>
        </div>
      ) : (
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((p) => (
            <article key={p.id} className="rounded-[18px] border border-line bg-white p-[18px] shadow-[0_7px_22px_rgba(6,29,49,0.04)]">
              <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#f1e9ff] text-xl text-[#7c3aed]">🕘</span>
              <h3 className="mt-3.5 text-[15px] font-black text-navy-900">{hi ? p.titleHi : p.titleEn}</h3>
              <p className="mt-1 text-[10.5px] text-muted">{hi ? p.examNameHi : p.examNameEn} · {p.year}</p>
              <div className="mt-3.5">
                <PyqDownloadButton id={p.id} locale={locale} />
              </div>
            </article>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
