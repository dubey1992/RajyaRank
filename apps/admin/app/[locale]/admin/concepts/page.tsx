import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ConceptsManager } from '@/components/ConceptsManager';
import type { ConceptView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

interface Ref { id: string; code: string; nameHi: string; nameEn: string }

export default async function ConceptsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'कॉन्सेप्ट ग्राफ़' : 'Concept Graph';

  if (!can(me, 'course.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="course.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const exams = await apiFetchServer<Ref[]>('/admin/catalogue/exams', cookie);
  const firstExamId = exams?.[0]?.id ?? '';
  const concepts = firstExamId ? await apiFetchServer<ConceptView[]>(`/admin/concepts?examId=${firstExamId}`, cookie) : [];

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'हर परीक्षा के लिए एक कॉन्सेप्ट ट्री बनाएँ, फिर मौजूदा पाठ व प्रश्नों को कॉन्सेप्ट से जोड़ें — यही डेटा छात्र की Exam Readiness Score गणना का आधार है।'
          : 'Build a concept tree per exam, then link existing lessons and questions to each concept — this is the data foundation the student Exam Readiness Score is computed from.'}
      </p>
      <ConceptsManager initialExams={exams ?? []} initialExamId={firstExamId} initialConcepts={concepts ?? []} locale={locale} />
    </Shell>
  );
}
