import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { AtRiskStudentsTable } from '@/components/AtRiskStudentsTable';
import type { AtRiskStudentView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function AtRiskStudentsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'इंटरवेंशन रडार' : 'Intervention Radar';

  if (!can(me, 'user.manage') || !me.orgId) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="user.manage" />
      </Shell>
    );
  }

  const students = (await apiFetchServer<AtRiskStudentView[]>('/admin/analytics/at-risk-students', cookies().toString())) ?? [];

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'निष्क्रियता, स्टडी प्लान में पिछड़ने, स्कोर में गिरावट या दोहराई जा रही ग़लतियों के आधार पर आपके संस्थान के जोखिम में छात्र — जोखिम स्तर के अनुसार क्रमबद्ध। हर घंटे अपडेट होता है।'
          : "Your institution's students flagged by inactivity, falling behind their study plan, a score decline, or a repeated mistake pattern — sorted by risk level. Refreshes hourly."}
      </p>
      <AtRiskStudentsTable students={students} locale={locale} />
    </Shell>
  );
}
