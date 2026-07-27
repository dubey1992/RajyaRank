import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { CustomerLookupManager } from '@/components/CustomerLookupManager';

export const dynamic = 'force-dynamic';

export default async function CustomerLookupPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'ग्राहक खोज' : 'Customer Lookup';

  if (!can(me, 'support.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="support.manage" />
      </Shell>
    );
  }

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        {hi
          ? 'नाम, ईमेल, फ़ोन या ऑर्डर आईडी से किसी छात्र को खोजें और उनके खाते की पूरी जानकारी एक ही स्क्रीन पर देखें।'
          : 'Search a student by name, email, phone, or order id, and see everything about their account on one screen.'}
      </p>
      <CustomerLookupManager locale={locale} />
    </Shell>
  );
}
