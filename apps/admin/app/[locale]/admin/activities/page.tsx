import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { auditLabel, resultLabel } from '@/lib/labels';
import type { AuditEvent, OrganizationView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export default async function ActivitiesPage({
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
  const title = L('हाल की गतिविधियाँ', 'Recent Activities');

  if (!can(me, 'audit.view')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="audit.view" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const org = searchParams.org ?? '';
  const [orgs, events] = await Promise.all([
    apiFetchServer<OrganizationView[]>('/admin/organizations', cookie).then((r) => r ?? []),
    apiFetchServer<AuditEvent[]>(`/admin/audit-events${org ? `?orgId=${encodeURIComponent(org)}` : ''}`, cookie).then((r) => r ?? []),
  ]);

  return (
    <Shell me={me} locale={locale} title={title}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          {L('प्रत्येक सुरक्षा-संवेदनशील कार्रवाई यहाँ दर्ज होती है। संस्थान के आधार पर छानें।', 'Every security-sensitive action is recorded here. Filter by institution.')}
        </p>
        {/* Institution filter (GET form → server re-fetch) */}
        <form method="get" className="flex items-center gap-2">
          <label htmlFor="org" className="text-xs font-extrabold text-muted">{L('संस्थान', 'Institution')}</label>
          <select id="org" name="org" defaultValue={org} className="min-h-[38px] rounded-md border border-line bg-white px-3 text-sm">
            <option value="">{L('सभी संस्थान', 'All institutions')}</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button type="submit" className="rounded-md bg-navy-900 px-3 py-2 text-xs font-extrabold text-white">{L('लागू करें', 'Apply')}</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        {events.length === 0 ? (
          <p className="p-6 text-sm text-muted">{L('कोई गतिविधि नहीं मिली।', 'No activity found.')}</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="font-bold text-ink">{auditLabel(e.action, locale)}</span>
                  {e.actorRole ? <span className="ml-2 rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-extrabold text-navy-800">{e.actorRole}</span> : null}
                  <span className="ml-2 text-xs text-muted">{new Date(e.createdAt).toLocaleString(hi ? 'hi-IN' : 'en-IN')}</span>
                </span>
                <span className={`whitespace-nowrap text-xs font-extrabold ${e.result === 'DENIED' ? 'text-danger' : e.result === 'FAILED' ? 'text-warning' : 'text-success'}`}>
                  {resultLabel(e.result, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
