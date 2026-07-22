import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/** Settlements now lives as a tab on the merged Institutions & Settlements
 *  page — this route only exists so old links/bookmarks still land somewhere. */
export default function SettlementsRedirect({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  redirect(`/${locale}/admin/organizations?tab=settlements`);
}
