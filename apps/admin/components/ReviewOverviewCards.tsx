import Link from 'next/link';

export interface ReviewOverview {
  pendingReview: number;
  submitted: number;
  underReview: number;
  approvedByMeTotal: number;
  approvedByMeThisWeek: number;
  openDoubts: number;
}

/** Academic Reviewer's queue snapshot — pending count matches their exact
 *  scope-filtered review queue. */
export function ReviewOverviewCards({ data, locale }: { data: ReviewOverview; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const cards: { label: string; value: string; tone: string }[] = [
    { label: hi ? 'समीक्षा हेतु लंबित' : 'Pending review', value: String(data.pendingReview), tone: 'text-warning' },
    { label: hi ? 'नई सबमिट' : 'Newly submitted', value: String(data.submitted), tone: 'text-navy-900' },
    { label: hi ? 'समीक्षाधीन' : 'Under review', value: String(data.underReview), tone: 'text-navy-900' },
    { label: hi ? 'इस सप्ताह स्वीकृत' : 'Approved this week', value: String(data.approvedByMeThisWeek), tone: 'text-success' },
    { label: hi ? 'कुल स्वीकृत (मेरे द्वारा)' : 'Approved by me (total)', value: String(data.approvedByMeTotal), tone: 'text-success' },
    { label: hi ? 'खुले संदेह' : 'Open doubts', value: String(data.openDoubts), tone: 'text-navy-900' },
  ];
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-navy-900">{hi ? 'समीक्षा अवलोकन' : 'Review overview'}</h2>
        <Link href={`/${locale}/admin/review-queue`} className="rounded-md bg-orange-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-orange-600">
          {hi ? 'समीक्षा क़तार खोलें' : 'Open review queue'}
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-line bg-white p-4">
            <div className="text-xs font-extrabold uppercase text-muted">{c.label}</div>
            <div className={`mt-1 text-2xl font-black ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
