import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ContentKanban, type KanbanItem } from '@/components/ContentKanban';
import { CreateContentWizard } from '@/components/CreateContentWizard';
import { TabbedSections, type TabSection } from '@/components/TabbedSections';

export const dynamic = 'force-dynamic';

/** Content workflow board + own drafts, merged into one page for anyone who'd
 *  otherwise see both "Content" and "My Content" as separate nav entries
 *  (Academic Head, Content Admin, or any future role with both permissions —
 *  see showsMergedContent in Shell.tsx). */
export default async function ManageContentPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'कंटेंट प्रबंधन' : 'Manage Content';

  const canBoard = can(me, 'content.edit_all') || can(me, 'content.review');
  const canView = canBoard || can(me, 'content.publish') || can(me, 'course.manage');
  const canMine = can(me, 'content.create');
  if (!canView && !canMine) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="content.review" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [boardItems, mineItems] = await Promise.all([
    canBoard ? apiFetchServer<KanbanItem[]>('/staff/content/board', cookie) : Promise.resolve(null),
    canMine ? apiFetchServer<KanbanItem[]>('/staff/content/mine', cookie) : Promise.resolve(null),
  ]);

  const sections: TabSection[] = [];
  if (canView) {
    sections.push({
      key: 'content',
      label: hi ? 'कंटेंट' : 'Content',
      content: (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-sm text-muted">
              {hi
                ? 'आपके स्कोप में सभी कंटेंट का कार्यप्रवाह बोर्ड। समीक्षा करें, सुधार माँगें, और प्रकाशित करें। प्रकाशन हेतु content.publish + MFA (AAL2) आवश्यक है।'
                : 'Workflow board for all content in your scope. Review, request corrections, and publish. Publishing requires content.publish + MFA (AAL2).'}
            </p>
            {can(me, 'course.manage') ? <CreateContentWizard locale={locale} allowedTypes={['VIDEO', 'PDF', 'TEXT', 'MIXED']} /> : null}
          </div>
          {canBoard ? (
            <ContentKanban
              items={boardItems ?? []}
              locale={locale}
              caps={{
                submit: can(me, 'content.submit_review') || can(me, 'content.edit_all'),
                review: can(me, 'content.review'),
                approve: can(me, 'content.approve'),
                publish: can(me, 'content.publish'),
                unpublish: can(me, 'content.unpublish'),
                archive: can(me, 'content.archive'),
              }}
            />
          ) : (
            <p className="text-sm text-muted">
              {hi
                ? 'आप कंटेंट बना सकते हैं; कार्यप्रवाह बोर्ड देखने के लिए समीक्षा या कंटेंट-प्रबंधन अनुमति आवश्यक है।'
                : 'You can create content; viewing the workflow board requires review or content-management permission.'}
            </p>
          )}
        </>
      ),
    });
  }
  if (canMine) {
    sections.push({
      key: 'mine',
      label: hi ? 'मेरा कंटेंट' : 'My Content',
      content: (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-sm text-muted">
              {hi
                ? 'आपके पाठ और उनकी कार्यप्रवाह स्थिति। ड्राफ़्ट समीक्षा हेतु भेजें; प्रकाशन एकेडमिक हेड या रिव्यूअर की स्वीकृति के बाद ही होगा।'
                : 'Your lessons and their workflow status. Submit drafts for review; publishing happens after an Academic Head or Reviewer approves.'}
            </p>
            {can(me, 'course.manage') ? <CreateContentWizard locale={locale} allowedTypes={['VIDEO', 'PDF', 'TEXT', 'MIXED']} /> : null}
          </div>
          {(mineItems ?? []).length === 0 ? (
            <p className="text-sm text-muted">
              {hi ? 'अभी कोई कंटेंट नहीं। आपके ड्राफ़्ट यहाँ दिखेंगे।' : 'No content yet. Your drafts will appear here.'}
            </p>
          ) : (
            <ContentKanban items={mineItems ?? []} locale={locale} caps={{ submit: can(me, 'content.submit_review') || can(me, 'content.create') }} />
          )}
        </>
      ),
    });
  }

  return (
    <Shell me={me} locale={locale} title={title}>
      <TabbedSections sections={sections} />
    </Shell>
  );
}
