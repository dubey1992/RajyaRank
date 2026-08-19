import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { getMe, initialsOf } from '@/lib/student';
import { PublicHeader } from '@/components/PublicHeader';
import { StudentShell } from '@/components/StudentShell';

export const dynamic = 'force-dynamic';

// NEXT_PUBLIC_ deliberately, not WEB_PUBLIC_URL — see the comment in robots.ts.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

interface CurrentAffairDetail {
  id: string;
  dateFor: string;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
  category: string;
  scope: string;
  source: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  orgName: string | null;
}

async function getItem(id: string) {
  return apiFetchServer<CurrentAffairDetail>(`/current-affairs/${id}`, '');
}

export async function generateMetadata({ params }: { params: { locale: string; id: string } }): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const item = await getItem(params.id);
  if (!item) return { title: hi ? 'करेंट अफेयर आइटम नहीं मिला' : 'Current affair not found' };

  const title = hi ? item.titleHi : item.titleEn;
  const body = hi ? item.bodyHi : item.bodyEn;
  const description = body.length > 155 ? `${body.slice(0, 155)}…` : body;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/current-affairs/${params.id}`,
      languages: {
        'hi-IN': `/hi/current-affairs/${params.id}`,
        'en-IN': `/en/current-affairs/${params.id}`,
        'x-default': `/hi/current-affairs/${params.id}`,
      },
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${SITE}/${locale}/current-affairs/${params.id}`,
      publishedTime: item.publishedAt ?? undefined,
    },
  };
}

export default async function CurrentAffairDetailPage({ params }: { params: { locale: string; id: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const cookie = cookies().toString();

  const [me, item] = await Promise.all([getMe(cookie), getItem(params.id)]);
  if (!item) notFound();

  const title = hi ? item.titleHi : item.titleEn;
  const body = hi ? item.bodyHi : item.bodyEn;
  const isNew = item.publishedAt && Date.now() - new Date(item.publishedAt).getTime() < 2 * 24 * 60 * 60 * 1000;

  const content = (
    <>
      <nav className="mb-4 text-sm text-muted">
        <Link href={`/${locale}/current-affairs`} className="font-bold text-orange-600 hover:underline">
          ← {L('करेंट अफेयर्स पर वापस जाएँ', 'Back to current affairs')}
        </Link>
      </nav>

      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-navy-100 px-2 py-0.5 font-extrabold text-navy-900">{item.category}</span>
        <span className="rounded-full bg-teal-100 px-2 py-0.5 font-extrabold text-teal-600">{item.scope}</span>
        {item.orgName ? (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 font-extrabold text-orange-600">{item.orgName}</span>
        ) : (
          <span className="rounded-full bg-surface-soft px-2 py-0.5 font-extrabold text-muted">{L('RajyaRank संपादकीय', 'RajyaRank Editorial')}</span>
        )}
        {isNew ? <span className="rounded-full bg-navy-100 px-2 py-0.5 font-extrabold text-navy-800">{L('नया', 'New')}</span> : null}
        <span className="text-muted">{new Date(item.dateFor).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>

      <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-navy-950 md:text-4xl">{title}</h1>

      <div className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-ink">{body}</div>

      {item.source ? (
        <p className="mt-6 text-xs text-muted">
          {L('स्रोत:', 'Source:')} {item.source}
        </p>
      ) : null}
    </>
  );

  // Logged-in student → portal shell.
  if (me && me.kind === 'STUDENT') {
    return (
      <StudentShell locale={locale} name={me.displayName ?? L('विद्यार्थी', 'Student')} initials={initialsOf(me.displayName)} target={L('करंट अफेयर्स', 'Current Affairs')} hasInstitute={Boolean(me.orgId)}>
        {content}
      </StudentShell>
    );
  }

  // Public visitor → marketing header + SEO structured data.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: body.length > 200 ? `${body.slice(0, 200)}…` : body,
    datePublished: item.publishedAt ?? item.createdAt,
    dateModified: item.updatedAt,
    author: { '@type': 'Organization', name: item.orgName ?? 'RajyaRank' },
    publisher: { '@type': 'Organization', name: 'RajyaRank' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/${locale}/current-affairs/${params.id}` },
  };

  return (
    <>
      <PublicHeader locale={locale} me={me} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10">
        {content}
      </main>
    </>
  );
}
