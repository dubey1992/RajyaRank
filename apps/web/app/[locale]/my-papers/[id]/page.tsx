import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { StudentPaperDetail } from '@/components/StudentPaperDetail';
import type { StudentPaperView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function MyPaperDetailPage({ params }: { params: { locale: string; id: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/my-papers/${params.id}`)}`);

  const papers = await apiFetchServer<StudentPaperView[]>('/student/my-papers', cookie);
  const paper = papers?.find((p) => p.id === params.id);
  if (!paper) notFound();

  return (
    <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={paper.title} hasInstitute={Boolean(me.orgId)}>
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{paper.title}</h1>
      </div>
      <StudentPaperDetail initial={paper} locale={locale} />
    </StudentShell>
  );
}
