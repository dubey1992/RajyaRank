import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import type { OrganizationView } from '@rajyarank/contracts';

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

const STATUS_TONE: Record<string, string> = {
  PAID: 'bg-teal-100 text-success',
  CREATED: 'bg-navy-100 text-navy-800',
  FAILED: 'bg-orange-100 text-danger',
  REFUNDED: 'bg-orange-100 text-warning',
};

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { org?: string };
}) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const me = await getMeOrRedirect(locale);
  const title = L('भुगतान प्रबंधन', 'Manage Payments');

  if (!can(me, 'payment.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="payment.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const org = searchParams.org ?? '';
  const [orgs, orders] = await Promise.all([
    apiFetchServer<OrganizationView[]>('/admin/organizations', cookie).then((r) => r ?? []),
    apiFetchServer<AdminOrder[]>(`/admin/payments/orders${org ? `?orgId=${encodeURIComponent(org)}` : ''}`, cookie).then((r) => r ?? []),
  ]);
  const paidTotal = orders.filter((o) => o.status === 'PAID').reduce((s, o) => s + o.amountMinor, 0);

  return (
    <Shell me={me} locale={locale} title={title}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-lg border border-line bg-white px-4 py-3">
          <div className="text-xs font-extrabold uppercase text-muted">{L('कुल भुगतान (पेड)', 'Total collected (paid)')}</div>
          <div className="text-2xl font-black text-navy-900">₹{(paidTotal / 100).toLocaleString('en-IN')}</div>
        </div>
        <form method="get" className="flex items-center gap-2">
          <label htmlFor="org" className="text-xs font-extrabold text-muted">{L('संस्थान', 'Institution')}</label>
          <select id="org" name="org" defaultValue={org} className="min-h-[38px] rounded-md border border-line bg-white px-3 text-sm">
            <option value="">{L('सभी संस्थान', 'All institutions')}</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button type="submit" className="rounded-md bg-navy-900 px-3 py-2 text-xs font-extrabold text-white">{L('लागू करें', 'Apply')}</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        {orders.length === 0 ? (
          <p className="p-6 text-sm text-muted">{L('कोई ऑर्डर नहीं मिला।', 'No orders found.')}</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">{L('उत्पाद', 'Product')}</th>
                <th className="px-4 py-2">{L('खरीदार', 'Buyer')}</th>
                <th className="px-4 py-2">{L('संस्थान', 'Institution')}</th>
                <th className="px-4 py-2">{L('राशि', 'Amount')}</th>
                <th className="px-4 py-2">{L('स्थिति', 'Status')}</th>
                <th className="px-4 py-2">{L('तिथि', 'Date')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line/60">
                  <td className="px-4 py-2 font-bold text-ink">{hi ? o.productHi : o.productEn}</td>
                  <td className="px-4 py-2 text-muted">{o.buyer}</td>
                  <td className="px-4 py-2 text-muted">{o.institution ?? '—'}</td>
                  <td className="px-4 py-2 font-extrabold text-navy-900">₹{(o.amountMinor / 100).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${STATUS_TONE[o.status] ?? 'bg-line text-ink'}`}>{o.status}</span></td>
                  <td className="px-4 py-2 text-muted">{new Date(o.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}
