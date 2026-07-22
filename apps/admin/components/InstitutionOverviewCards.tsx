import type { Locale } from '@/lib/i18n';

export interface InstitutionOverview {
  staff: number;
  students: number;
  courses: number;
  lessonsPublished: number;
  lessonsPendingReview: number;
  tests: number;
  openDoubts: number;
  openTickets: number;
}

/** Academic Head's institution snapshot — strictly scoped to their own org. */
export function InstitutionOverviewCards({ data, locale }: { data: InstitutionOverview; locale: Locale }) {
  const hi = locale === 'hi';
  const cards: { label: string; value: string; tone: string }[] = [
    { label: hi ? 'स्टाफ़' : 'Staff', value: String(data.staff), tone: 'text-navy-900' },
    { label: hi ? 'छात्र' : 'Students', value: String(data.students), tone: 'text-navy-900' },
    { label: hi ? 'कोर्स' : 'Courses', value: String(data.courses), tone: 'text-navy-900' },
    { label: hi ? 'प्रकाशित पाठ' : 'Published lessons', value: String(data.lessonsPublished), tone: 'text-success' },
    { label: hi ? 'समीक्षा हेतु लंबित' : 'Pending review', value: String(data.lessonsPendingReview), tone: 'text-warning' },
    { label: hi ? 'टेस्ट' : 'Tests', value: String(data.tests), tone: 'text-navy-900' },
    { label: hi ? 'खुले संदेह' : 'Open doubts', value: String(data.openDoubts), tone: 'text-navy-900' },
    { label: hi ? 'खुले टिकट' : 'Open tickets', value: String(data.openTickets), tone: 'text-navy-900' },
  ];
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{c.label}</div>
          <div className={`mt-1 text-2xl font-black ${c.tone}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
