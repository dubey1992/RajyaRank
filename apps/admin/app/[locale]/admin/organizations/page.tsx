import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { OrganizationsManager } from '@/components/OrganizationsManager';
import { SettlementsManager } from '@/components/SettlementsManager';
import { TabbedSections } from '@/components/TabbedSections';
import type { OrganizationView, SettlementSummaryView, LinkedAccountView, TransferView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'संस्थान प्रबंधन' : 'Manage Institutions';

  if (!can(me, 'org.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="org.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [orgs, summary, accounts, transfers] = await Promise.all([
    apiFetchServer<OrganizationView[]>('/admin/organizations', cookie),
    apiFetchServer<SettlementSummaryView>('/admin/settlements/summary', cookie),
    apiFetchServer<LinkedAccountView[]>('/admin/settlements/linked-accounts', cookie),
    apiFetchServer<TransferView[]>('/admin/settlements/transfers', cookie),
  ]);

  return (
    <Shell me={me} locale={locale} title={title}>
      <TabbedSections
        sections={[
          {
            key: 'institutions',
            label: hi ? 'संस्थान' : 'Institutions',
            content: (
              <>
                <p className="mb-4 max-w-2xl text-sm text-muted">
                  {hi
                    ? 'नए संस्थान/संगठन और उनके प्रमुख यहाँ पंजीकृत करें। प्रमुख अपने संस्थान में स्टाफ़ आमंत्रित कर सकते हैं।'
                    : 'Register new institutions/organizations and their heads here. Each head can invite staff within their own institution.'}
                </p>
                <OrganizationsManager initial={orgs ?? []} locale={locale} />
              </>
            ),
          },
          {
            key: 'settlements',
            label: hi ? 'निपटान' : 'Settlements',
            content: (
              <>
                <p className="mb-4 max-w-2xl text-sm text-muted">
                  {hi ? 'लिंक्ड-खाता भुगतान और सामंजस्य अवलोकन।' : 'Linked-account payout and reconciliation overview.'}
                </p>
                <SettlementsManager
                  summary={summary ?? { grossMinor: 0, institutionPayableMinor: 0, platformRevenueMinor: 0, reserveHeldMinor: 0 }}
                  initialLinkedAccounts={accounts ?? []}
                  initialTransfers={transfers ?? []}
                  locale={locale}
                />
              </>
            ),
          },
        ]}
      />
    </Shell>
  );
}
