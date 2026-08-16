import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { IndependentStudentsManager } from '@/components/IndependentStudentsManager';
import type { IndependentStudentListItem } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function IndependentStudentsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'स्वतंत्र छात्र' : 'Independent Students';

  if (!can(me, 'support.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="support.manage" />
      </Shell>
    );
  }

  const students = (await apiFetchServer<IndependentStudentListItem[]>('/admin/students/independent', cookies().toString())) ?? [];

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'ऐसे छात्र जिन्होंने सीधे "नया खाता बनाएँ" से साइन अप किया और अभी तक किसी संस्थान के कोड से नहीं जुड़े। कोड डालते ही वे यहाँ से हटकर उस संस्थान की सूची में चले जाते हैं।'
          : 'Students who signed up directly via "Create new account" and have not yet joined any institute with a code. As soon as they enter a code, they move off this list and into that institute’s own roster.'}
      </p>
      <IndependentStudentsManager initial={students} locale={locale} />
    </Shell>
  );
}
