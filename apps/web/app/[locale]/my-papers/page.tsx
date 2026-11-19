import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { MyPapersList } from '@/components/MyPapersList';
import type { StudentPaperView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function MyPapersPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/my-papers`)}`);

  const papers = await apiFetchServer<StudentPaperView[]>('/student/my-papers', cookie);

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('मेरे पेपर', 'My papers')} hasInstitute={Boolean(me.orgId)}>
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{L('मेरे पिछले वर्ष के पेपर', 'My previous-year papers')}</h1>
        <p className="mt-1 text-sm text-muted">{L('अपना पेपर अपलोड करें, समयबद्ध अभ्यास करें, और खुद को जाँचें।', 'Upload your own paper, practice it timed, and check yourself.')}</p>
      </div>
      <MyPapersList initial={papers ?? []} locale={locale} />
    </StudentShell>
  );
}
