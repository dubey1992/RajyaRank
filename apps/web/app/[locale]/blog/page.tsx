import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { PublicHeader } from '@/components/PublicHeader';
import type { BlogPostSummary } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const title = hi ? 'ब्लॉग' : 'Blog';
  const description = hi
    ? 'परीक्षा रणनीति, सिलेबस गाइड और तैयारी टिप्स — RajyaRank टीम की ओर से।'
    : 'Exam strategy, syllabus guides, and preparation tips from the RajyaRank team.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/blog`,
      languages: { 'hi-IN': '/hi/blog', 'en-IN': '/en/blog', 'x-default': '/hi/blog' },
      types: { 'application/rss+xml': `/${locale}/feed.xml` },
    },
  };
}

function timeAgo(iso: string, hi: boolean) {
  return new Date(iso).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #0b2f4f, #0f8b78)',
  'linear-gradient(135deg, #ea580c, #0b2f4f)',
  'linear-gradient(135deg, #0f8b78, #12476f)',
];

export default async function BlogIndexPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { category?: string };
}) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const activeCategory = searchParams.category;

  const qs = activeCategory ? `?category=${encodeURIComponent(activeCategory)}` : '';
  const posts = (await apiFetchServer<BlogPostSummary[]>(`/blog${qs}`, '')) ?? [];
  const allPosts = activeCategory ? ((await apiFetchServer<BlogPostSummary[]>('/blog', '')) ?? []) : posts;
  const categories = Array.from(new Set(allPosts.map((p) => p.category))).sort();

  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main" className="mx-auto max-w-6xl px-4 py-10">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-black tracking-tight text-navy-950 md:text-4xl">{L('ब्लॉग', 'Blog')}</h1>
          <p className="mt-2 text-muted">
            {L('परीक्षा रणनीति, सिलेबस गाइड और तैयारी टिप्स।', 'Exam strategy, syllabus guides, and preparation tips.')}
          </p>
        </div>

        {categories.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/${locale}/blog`}
              className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${!activeCategory ? 'border-orange-500 bg-orange-500 text-white' : 'border-line bg-white text-ink hover:border-orange-300'}`}
            >
              {L('सभी', 'All')}
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                href={`/${locale}/blog?category=${encodeURIComponent(c)}`}
                className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${activeCategory === c ? 'border-orange-500 bg-orange-500 text-white' : 'border-line bg-white text-ink hover:border-orange-300'}`}
              >
                {c}
              </Link>
            ))}
          </div>
        ) : null}

        {posts.length === 0 ? (
          <p className="mt-10 text-sm text-muted">{L('जल्द ही नए लेख आएँगे।', 'New articles coming soon.')}</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <Link
                key={p.id}
                href={`/${locale}/blog/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className="flex h-40 items-end p-4"
                  style={{
                    background: p.coverImageUrl ? undefined : COVER_GRADIENTS[i % COVER_GRADIENTS.length],
                    backgroundImage: p.coverImageUrl ? `url(${p.coverImageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-extrabold text-navy-900">{p.category}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-lg font-extrabold leading-snug text-navy-950 group-hover:text-orange-600">
                    {hi ? p.titleHi : p.titleEn}
                  </h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{hi ? p.excerptHi : p.excerptEn}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted">
                    <span>{p.authorName}</span>
                    <span>
                      {p.publishedAt ? timeAgo(p.publishedAt, hi) : ''} · {p.readingMinutes} {L('मिनट पठन', 'min read')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
