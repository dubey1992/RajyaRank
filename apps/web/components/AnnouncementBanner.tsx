import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import type { MarketingBannerView } from '@rajyarank/contracts';

/** Homepage top announcement bar — content + on/off are Super-Admin-managed
 *  (admin/marketing → "Homepage banner"), not hardcoded. Renders nothing when
 *  disabled or unset, so a fresh environment with no row yet just shows
 *  nothing here rather than a broken/empty bar. */
export function AnnouncementBanner({ banner, locale }: { banner: MarketingBannerView | null; locale: Locale }) {
  if (!banner || !banner.enabled) return null;
  const hi = locale === 'hi';
  const message = hi ? banner.messageHi : banner.messageEn;
  const ctaLabel = hi ? banner.ctaLabelHi : banner.ctaLabelEn;
  const isExternal = banner.ctaHref && (banner.ctaHref.startsWith('mailto:') || banner.ctaHref.startsWith('http'));
  const href = banner.ctaHref ? (isExternal ? banner.ctaHref : `/${locale}${banner.ctaHref}`) : null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-navy-950 px-4 py-2 text-center text-[13px] font-medium text-white">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
      </span>
      <span>{message}</span>
      {href && ctaLabel ? (
        isExternal ? (
          <a href={href} className="font-black text-orange-300 underline decoration-orange-300/60 underline-offset-2 hover:text-orange-200">
            {ctaLabel} →
          </a>
        ) : (
          <Link href={href} className="font-black text-orange-300 underline decoration-orange-300/60 underline-offset-2 hover:text-orange-200">
            {ctaLabel} →
          </Link>
        )
      ) : null}
    </div>
  );
}
