import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { PendingRefundApprovalsManager } from '@/components/PendingRefundApprovalsManager';
import type { PendingRefundView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

/** Super Admin only — Academic Heads request refunds inline from the Student
 *  Payments page; approving/rejecting across every institute is a
 *  platform-oversight action, so this screen (and its institute filter)
 *  lives only here, not duplicated into each Head's own panel. */
export default async function RefundsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'धनवापसी प्रबंधन' : 'Refund Management';

  if (!can(me, 'payment.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="payment.manage" />
      </Shell>
    );
  }

  const pending = (await apiFetchServer<PendingRefundView[]>('/admin/refunds/pending', cookies().toString())) ?? [];

  return (
    <Shell me={me} locale={locale} title={title}>
      <PendingRefundApprovalsManager initial={pending} locale={locale} />
    </Shell>
  );
}
