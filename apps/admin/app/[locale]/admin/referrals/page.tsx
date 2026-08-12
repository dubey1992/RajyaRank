import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';

export const dynamic = 'force-dynamic';

interface ReferralStats {
  accessCode: string | null;
  totalReferredSignups: number;
  convertedSignups: number;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function ReferralsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const me = await getMeOrRedirect(locale);
  const title = L('रेफ़रल', 'Referrals');

  if (!can(me, 'course.manage') || !me.orgId) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="course.manage" />
      </Shell>
    );
  }

  const stats = await apiFetchServer<ReferralStats>('/academic/organization/referrals', cookies().toString());
  const link = stats?.accessCode ? `${SITE}/${locale}?ref=${stats.accessCode}` : null;
  const shareText = hi
    ? `RajyaRank पर मुफ़्त क्विज़ और तैयारी सामग्री देखें: ${link}`
    : `Check out free quizzes and prep material on RajyaRank: ${link}`;

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        {L(
          'अपने छात्रों को यह लिंक भेजें — जो भी इससे साइन अप करता है, वह यहाँ गिना जाएगा। यह वही कोड है जो चेकआउट पर संस्थान की कीमत अनलॉक करता है।',
          'Share this link with your students — anyone who signs up through it counts here. Same code that unlocks your institute pricing at checkout.',
        )}
      </p>

      {!stats?.accessCode ? (
        <p className="text-sm text-muted">
          {L('अभी जारी नहीं। Super Admin से संपर्क करें।', 'Not issued yet — contact your Super Admin.')}
        </p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-white p-5">
              <div className="text-3xl font-black text-navy-950">{stats.totalReferredSignups}</div>
              <p className="mt-1 text-sm text-muted">{L('रेफ़र किए गए साइनअप', 'Referred signups')}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-5">
              <div className="text-3xl font-black text-navy-950">{stats.convertedSignups}</div>
              <p className="mt-1 text-sm text-muted">{L('भुगतान करने वाले छात्र', 'Converted to paying students')}</p>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-5">
            <label className="mb-1.5 block text-xs font-extrabold uppercase text-muted">
              {L('आपका रेफ़रल लिंक', 'Your referral link')}
            </label>
            <input
              readOnly
              value={link ?? ''}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-md border border-line bg-surface-soft px-3 py-2 text-sm text-ink"
            />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-orange-600"
            >
              {L('WhatsApp पर शेयर करें', 'Share on WhatsApp')}
            </a>
          </div>
        </>
      )}
    </Shell>
  );
}
