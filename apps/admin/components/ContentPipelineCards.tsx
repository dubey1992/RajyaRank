import type { Locale } from '@/lib/i18n';

export interface ContentPipelineOverview {
  draft: number;
  submittedOrUnderReview: number;
  correctionRequired: number;
  approved: number;
  published: number;
  archivedOrRejected: number;
  courses: number;
  tests: number;
  questionsPending: number;
}

/** Content Admin's production pipeline — org-scoped for an institution's admin,
 *  platform-wide for the platform Content Admin (no orgId). */
export function ContentPipelineCards({ data, locale }: { data: ContentPipelineOverview; locale: Locale }) {
  const hi = locale === 'hi';
  const stageCards: { label: string; value: string; tone: string }[] = [
    { label: hi ? 'ड्राफ़्ट' : 'Draft', value: String(data.draft), tone: 'text-navy-900' },
    { label: hi ? 'समीक्षाधीन' : 'In review', value: String(data.submittedOrUnderReview), tone: 'text-warning' },
    { label: hi ? 'सुधार आवश्यक' : 'Correction requested', value: String(data.correctionRequired), tone: 'text-danger' },
    { label: hi ? 'प्रकाशन हेतु तैयार' : 'Ready to publish', value: String(data.approved), tone: 'text-teal-600' },
    { label: hi ? 'प्रकाशित' : 'Published', value: String(data.published), tone: 'text-success' },
    { label: hi ? 'संग्रहीत/अस्वीकृत' : 'Archived/Rejected', value: String(data.archivedOrRejected), tone: 'text-muted' },
  ];
  const otherCards: { label: string; value: string; tone: string }[] = [
    { label: hi ? 'कोर्स' : 'Courses', value: String(data.courses), tone: 'text-navy-900' },
    { label: hi ? 'टेस्ट' : 'Tests', value: String(data.tests), tone: 'text-navy-900' },
    { label: hi ? 'प्रश्न स्वीकृति हेतु लंबित' : 'Questions pending approval', value: String(data.questionsPending), tone: 'text-warning' },
  ];
  return (
    <div className="mb-6">
      <h2 className="mb-3 text-lg font-extrabold text-navy-900">{hi ? 'कंटेंट पाइपलाइन' : 'Content pipeline'}</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stageCards.map((c) => (
          <div key={c.label} className="rounded-lg border border-line bg-white p-4">
            <div className="text-xs font-extrabold uppercase text-muted">{c.label}</div>
            <div className={`mt-1 text-2xl font-black ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {otherCards.map((c) => (
          <div key={c.label} className="rounded-lg border border-line bg-white p-4">
            <div className="text-xs font-extrabold uppercase text-muted">{c.label}</div>
            <div className={`mt-1 text-2xl font-black ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
