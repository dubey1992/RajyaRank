import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { RatingsModerationManager } from '@/components/RatingsModerationManager';

export const dynamic = 'force-dynamic';

export default async function RatingsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'रेटिंग मॉडरेशन' : 'Ratings Moderation';

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
          ? '"ध्यान देने योग्य" में केवल रिपोर्ट की गई या छिपाई गई रेटिंग्स दिखती हैं। हर सामान्य समीक्षा देखने के लिए "सभी रेटिंग्स" पर जाएँ।'
          : '"Needs attention" only shows reported or hidden ratings. Switch to "All ratings" to see every normal review too.'}
      </p>
      <RatingsModerationManager locale={locale} />
    </Shell>
  );
}
