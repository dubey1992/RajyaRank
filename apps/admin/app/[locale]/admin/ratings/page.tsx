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
          ? 'रिपोर्ट की गई या छिपाई गई छात्र रेटिंग्स — स्वीकृत करें ताकि वे फिर से सार्वजनिक हों, या छिपाएँ।'
          : 'Reported or hidden student ratings — approve to make them public again, or hide them.'}
      </p>
      <RatingsModerationManager locale={locale} />
    </Shell>
  );
}
