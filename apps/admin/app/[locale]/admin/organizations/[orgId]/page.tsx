import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import type { OrganizationDetailView, InstitutionEarningsView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

interface AdminOrder {
  id: string;
  status: string;
  amountMinor: number;
  productHi: string;
  productEn: string;
  buyer: string;
  institution: string | null;
  createdAt: string;
}

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

const KYC_TONE: Record<string, string> = {
  VERIFIED: 'bg-teal-100 text-success',
  PENDING: 'bg-orange-100 text-orange-700',
  REJECTED: 'bg-orange-100 text-danger',
};

const ORDER_STATUS_TONE: Record<string, string> = {
  PAID: 'bg-teal-100 text-success',
  CREATED: 'bg-navy-100 text-navy-800',
  PENDING: 'bg-navy-100 text-navy-800',
  FAILED: 'bg-orange-100 text-danger',
  REFUNDED_FULL: 'bg-orange-100 text-warning',
  REFUNDED_PARTIAL: 'bg-orange-100 text-warning',
};

export default async function OrganizationDetailPage({
  params,
}: {
  params: { locale: string; orgId: string };
}) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const me = await getMeOrRedirect(locale);
  const title = L('संस्थान अवलोकन', 'Institution Overview');

  if (!can(me, 'org.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="org.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const [detail, earnings, orders] = await Promise.all([
    apiFetchServer<OrganizationDetailView>(`/admin/organizations/${params.orgId}/detail`, cookie),
    apiFetchServer<InstitutionEarningsView>(`/admin/settlements/institutions/${params.orgId}/earnings`, cookie),
    apiFetchServer<AdminOrder[]>(`/admin/payments/orders?orgId=${encodeURIComponent(params.orgId)}`, cookie).then((r) => r ?? []),
  ]);
  if (!detail) notFound();

  const courseStatusLabel: Record<string, string> = {
    DRAFT: L('मसौदा', 'Draft'),
    ACTIVE: L('सक्रिय', 'Active'),
    INACTIVE: L('निष्क्रिय', 'Inactive'),
    ARCHIVED: L('संग्रहीत', 'Archived'),
  };
  const totalCourses = Object.values(detail.courseCountsByStatus).reduce((s, n) => s + n, 0);

  return (
    <Shell me={me} locale={locale} title={title}>
      <Link href={`/${locale}/admin/organizations`} className="mb-4 inline-block text-sm font-bold text-navy-700 hover:underline">
        {L('← संस्थान सूची पर वापस जाएं', '← Back to Institutions')}
      </Link>

      <div className="mb-4 rounded-md border border-line bg-surface-soft px-4 py-2 text-xs font-bold text-muted">
        {L(
          'यह संस्थान की गतिविधि का केवल-पठन अवलोकन है — Super Admin यहाँ से कोई कार्रवाई (कोर्स प्रकाशित करना, छात्र/स्टाफ़ प्रबंधन, धनवापसी) नहीं कर सकते।',
          'Read-only oversight — Super Admin cannot take institution-level actions (publishing content, managing students/staff, refunds) from this view.',
        )}
      </div>

      <div className="mb-6 rounded-lg border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-navy-950">{detail.name}</h2>
            <div className="text-xs text-muted">{detail.code} · {L('पंजीकृत', 'Registered')} {new Date(detail.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${detail.status === 'ACTIVE' ? 'bg-teal-100 text-success' : 'bg-orange-100 text-danger'}`}>
              {detail.status === 'ACTIVE' ? L('सक्रिय', 'Active') : L('निष्क्रिय', 'Inactive')}
            </span>
            {detail.kyc ? (
              <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${KYC_TONE[detail.kyc.status] ?? 'bg-line text-muted'}`}>
                {L('KYC', 'KYC')} {detail.kyc.status}
              </span>
            ) : (
              <span className="rounded-full bg-line px-2 py-0.5 text-xs font-extrabold text-muted">{L('KYC सबमिट नहीं', 'No KYC submitted')}</span>
            )}
          </div>
        </div>
        <div className="mt-3 text-sm">
          {detail.subscription ? (
            <span>
              <b>{detail.subscription.planNameEn}</b> · {detail.subscription.status}
              {detail.subscription.currentPeriodEnd ? ` · ${L('नवीनीकरण', 'renews')} ${new Date(detail.subscription.currentPeriodEnd).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}` : ''}
            </span>
          ) : (
            <span className="text-muted">{L('कोई सक्रिय सदस्यता नहीं', 'No active subscription')}</span>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('कुल कोर्स', 'Total courses')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{totalCourses}</div>
          <div className="mt-1 text-xs text-muted">
            {Object.entries(detail.courseCountsByStatus).map(([status, count]) => `${courseStatusLabel[status] ?? status}: ${count}`).join(' · ') || L('कोई नहीं', 'None')}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('छात्र', 'Students')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{detail.studentCount}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('स्टाफ़', 'Staff')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{detail.staffCount}</div>
        </div>
      </div>

      {earnings ? (
        <div className="mb-6 rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('कमाई सारांश', 'Earnings summary')}</h2>
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="rounded-md border border-line bg-surface-soft p-3">
              <div className="text-xs font-extrabold uppercase text-muted">{L('कुल बिक्री', 'Gross sales')}</div>
              <div className="mt-1 text-xl font-black text-navy-950">{rupees(earnings.internalGrossMinor + earnings.externalGrossMinor)}</div>
            </div>
            <div className="rounded-md border border-line bg-surface-soft p-3">
              <div className="text-xs font-extrabold uppercase text-muted">{L('उपलब्ध भुगतान', 'Available payout')}</div>
              <div className="mt-1 text-xl font-black text-navy-950">{rupees(earnings.payableMinor)}</div>
            </div>
            <div className="rounded-md border border-line bg-surface-soft p-3">
              <div className="text-xs font-extrabold uppercase text-muted">{L('समीक्षाधीन', 'Pending reconciliation')}</div>
              <div className="mt-1 text-xl font-black text-navy-950">{rupees(earnings.heldMinor)}</div>
            </div>
            <div className="rounded-md border border-line bg-surface-soft p-3">
              <div className="text-xs font-extrabold uppercase text-muted">{L('रिज़र्व होल्ड', 'Reserve held')}</div>
              <div className="mt-1 text-xl font-black text-navy-950">{rupees(earnings.reserveHeldMinor)}</div>
            </div>
            <div className="rounded-md border border-teal-200 bg-teal-100/40 p-3">
              <div className="text-xs font-extrabold uppercase text-muted">{L('बैंक में निपटाया गया', 'Settled to bank')}</div>
              {/* Defensive: earnings comes from the API, which can briefly lag this
                  page's own Amplify deploy — see the same fallback in EarningsPayoutsPanel. */}
              <div className="mt-1 text-xl font-black text-navy-950">{rupees(earnings.bankSettledMinor ?? 0)}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('हाल के ऑर्डर', 'Recent orders')} ({orders.length})</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई ऑर्डर नहीं।', 'No orders yet.')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('उत्पाद', 'Product')}</th>
                  <th className="px-3 py-2">{L('खरीदार', 'Buyer')}</th>
                  <th className="px-3 py-2">{L('राशि', 'Amount')}</th>
                  <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                  <th className="px-3 py-2">{L('तिथि', 'Date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2 font-bold text-ink">{hi ? o.productHi : o.productEn}</td>
                    <td className="px-3 py-2 text-muted">{o.buyer}</td>
                    <td className="px-3 py-2 font-extrabold text-navy-900">{rupees(o.amountMinor)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${ORDER_STATUS_TONE[o.status] ?? 'bg-line text-ink'}`}>{o.status}</span></td>
                    <td className="px-3 py-2 text-muted">{new Date(o.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
