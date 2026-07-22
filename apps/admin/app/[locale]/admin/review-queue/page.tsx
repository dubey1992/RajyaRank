import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { can } from '@/lib/permissions';
import { ContentKanban, type KanbanItem } from '@/components/ContentKanban';
import type { ReviewQueueItem } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function ReviewQueuePage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);

  if (!can(me, 'content.review')) {
    return (
      <Shell me={me} locale={locale} title={hi ? 'समीक्षा क़तार' : 'Review Queue'}>
        <AccessDenied locale={locale} permission="content.review" />
      </Shell>
    );
  }

  const items = (await apiFetchServer<ReviewQueueItem[]>('/staff/content/review-queue', cookies().toString())) ?? [];

  return (
    <Shell me={me} locale={locale} title={hi ? 'समीक्षा क़तार' : 'Review Queue'}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'आपके निर्दिष्ट स्कोप में समीक्षा हेतु प्रतीक्षारत कंटेंट। "समीक्षा करें" पर गुणवत्ता जाँच सूची के साथ अनुमोदन/सुधार करें।'
          : 'Content awaiting review in your assigned scope. Use “Review” to approve or request corrections with the quality checklist.'}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{hi ? 'आपके स्कोप में समीक्षा हेतु कुछ नहीं।' : 'Nothing awaiting review in your assigned scope.'}</p>
      ) : (
        <ContentKanban items={items as KanbanItem[]} locale={locale} caps={{ review: can(me, 'content.review'), approve: can(me, 'content.approve') }} />
      )}
    </Shell>
  );
}
