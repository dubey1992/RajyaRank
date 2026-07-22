import { redirect } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/** Superseded by the Course Studio, which now owns curriculum + pricing +
 *  readiness in one flow — redirect rather than leave a second, divergent
 *  editing surface reachable. Auth/permission checks live in the Studio page. */
export default function LegacyCourseDetailPage({ params }: { params: { locale: string; id: string } }) {
  const locale = resolveLocale(params.locale);
  redirect(`/${locale}/admin/courses/studio/${params.id}`);
}
