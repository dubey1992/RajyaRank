import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/** Institute Billing now lives as a tab on the merged Institution Plans &
 *  Billing page — this route only exists so old links/bookmarks still land somewhere. */
export default function InstitutionBillingRedirect({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  redirect(`/${locale}/admin/billing/plans?tab=billing`);
}
