import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ContentKanban, type KanbanItem } from '@/components/ContentKanban';
import { CreateContentWizard } from '@/components/CreateContentWizard';

export const dynamic = 'force-dynamic';

export default async function MyContentPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);

  if (!can(me, 'content.create')) {
    return (
      <Shell me={me} locale={locale} title={hi ? 'मेरा कंटेंट' : 'My Content'}>
        <AccessDenied locale={locale} permission="content.create" />
      </Shell>
    );
  }

  const items = (await apiFetchServer<KanbanItem[]>('/staff/content/mine', cookies().toString())) ?? [];

  return (
    <Shell me={me} locale={locale} title={hi ? 'मेरा कंटेंट' : 'My Content'}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          {hi
            ? 'आपके पाठ और उनकी कार्यप्रवाह स्थिति। ड्राफ़्ट समीक्षा हेतु भेजें; प्रकाशन एकेडमिक हेड या रिव्यूअर की स्वीकृति के बाद ही होगा।'
            : 'Your lessons and their workflow status. Submit drafts for review; publishing happens after an Academic Head or Reviewer approves.'}
        </p>
        {can(me, 'course.manage') ? <CreateContentWizard locale={locale} allowedTypes={['VIDEO', 'PDF', 'TEXT', 'MIXED']} /> : null}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">
          {hi ? 'अभी कोई कंटेंट नहीं। आपके ड्राफ़्ट यहाँ दिखेंगे।' : 'No content yet. Your drafts will appear here.'}
        </p>
      ) : (
        <ContentKanban items={items} locale={locale} caps={{ submit: can(me, 'content.submit_review') || can(me, 'content.create') }} />
      )}
    </Shell>
  );
}
