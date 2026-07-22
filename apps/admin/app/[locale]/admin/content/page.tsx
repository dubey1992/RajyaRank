import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { ContentKanban, type KanbanItem } from '@/components/ContentKanban';
import { CreateContentWizard } from '@/components/CreateContentWizard';
import { AccessDenied } from '@/components/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function ContentOpsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'कंटेंट संचालन' : 'Content Operations';

  const canBoard = can(me, 'content.edit_all') || can(me, 'content.review');
  const canView = canBoard || can(me, 'content.publish') || can(me, 'course.manage');
  if (!canView) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="content.review" />
      </Shell>
    );
  }

  const items = canBoard ? (await apiFetchServer<KanbanItem[]>('/staff/content/board', cookies().toString())) ?? [] : [];

  return (
    <Shell me={me} locale={locale} title={title}>
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
          items={items}
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
    </Shell>
  );
}
