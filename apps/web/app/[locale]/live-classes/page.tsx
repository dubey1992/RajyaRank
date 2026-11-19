import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import type { LiveClassView } from '@rajyarank/contracts';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe } from '@/lib/student';
import { StudentShell } from '@/components/StudentShell';
import { LiveClassesList } from '@/components/LiveClassesList';

export const dynamic = 'force-dynamic';

export default async function LiveClassesPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const cookie = cookies().toString();

  const me = await getMe(cookie);
  if (!me) redirect(`/${locale}/login`);
  const classes = (await apiFetchServer<LiveClassView[]>('/student/live-classes/upcoming', cookie)) ?? [];
  if (classes === null) notFound();

  return (
    <StudentShell locale={locale} name={me.displayName ?? ''} initials="S" target="" hasInstitute={Boolean(me.orgId)}>
      <div className="mb-6">
        <h1 className="text-[26px] font-black tracking-tight text-navy-950 md:text-[34px]">{hi ? 'लाइव क्लासेस' : 'Live Classes'}</h1>
        <p className="mt-1 text-sm text-muted">
          {hi ? 'आपके कोर्स की सभी लाइव और आगामी कक्षाएँ यहाँ दिखाई देती हैं।' : "Every live and upcoming class across your courses shows up here."}
        </p>
      </div>
      <LiveClassesList classes={classes} locale={locale} />
    </StudentShell>
  );
}
