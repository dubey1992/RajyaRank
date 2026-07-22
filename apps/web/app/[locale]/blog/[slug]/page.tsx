import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import { apiFetchServer } from '@/lib/api';
import { PublicHeader } from '@/components/PublicHeader';
import { MarkdownBody } from '@/components/MarkdownBody';
import type { BlogPostSummary, BlogPostView } from '@rajyarank/contracts';

export const dynamic = 'force-dynamic';

const SITE = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';

async function getPost(slug: string) {
  return apiFetchServer<BlogPostView>(`/blog/${slug}`, '');
}

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const post = await getPost(params.slug);
  if (!post) return { title: hi ? 'लेख नहीं मिला' : 'Post not found' };

  const title = (hi ? post.seoTitleHi : post.seoTitleEn) || (hi ? post.titleHi : post.titleEn);
  const description = (hi ? post.seoDescriptionHi : post.seoDescriptionEn) || (hi ? post.excerptHi : post.excerptEn);

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/blog/${params.slug}`,
      languages: { 'hi-IN': `/hi/blog/${params.slug}`, 'en-IN': `/en/blog/${params.slug}`, 'x-default': `/hi/blog/${params.slug}` },
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${SITE}/${locale}/blog/${params.slug}`,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
      publishedTime: post.publishedAt ?? undefined,
    },
    twitter: {
      card: post.coverImageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
    },
  };
}

export default async function BlogPostPage({ params }: { params: { locale: string; slug: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const post = await getPost(params.slug);
  if (!post) notFound();

  const related = ((await apiFetchServer<BlogPostSummary[]>(`/blog?category=${encodeURIComponent(post.category)}`, '')) ?? [])
    .filter((p) => p.id !== post.id)
    .slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: hi ? post.titleHi : post.titleEn,
    description: hi ? post.excerptHi : post.excerptEn,
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.publishedAt ?? post.createdAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: post.authorName },
    publisher: { '@type': 'Organization', name: 'RajyaRank' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/${locale}/blog/${params.slug}` },
  };

  return (
    <>
      <PublicHeader locale={locale} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10">
        <nav className="mb-6 text-sm text-muted">
          <Link href={`/${locale}/blog`} className="font-bold text-orange-600 hover:underline">
            ← {L('ब्लॉग पर वापस जाएँ', 'Back to blog')}
          </Link>
        </nav>

        <span className="rounded-full bg-navy-100 px-2.5 py-1 text-xs font-extrabold text-navy-900">{post.category}</span>
        <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-navy-950 md:text-4xl">
          {hi ? post.titleHi : post.titleEn}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="font-bold text-ink">{post.authorName}</span>
          <span>·</span>
          <span>{new Date(post.publishedAt ?? post.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span>·</span>
          <span>{post.readingMinutes} {L('मिनट पठन', 'min read')}</span>
        </div>

        {post.coverImageUrl ? (
          <img src={post.coverImageUrl} alt="" className="mt-6 w-full rounded-lg border border-line object-cover" style={{ aspectRatio: '16/9' }} />
        ) : null}

        <div className="mt-8">
          <MarkdownBody>{hi ? post.bodyHi : post.bodyEn}</MarkdownBody>
        </div>

        {post.tags.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-surface-soft px-2.5 py-1 text-xs font-bold text-muted">#{t}</span>
            ))}
          </div>
        ) : null}

        <div
          className="mt-10 rounded-[22px] p-8 text-center text-white"
          style={{ background: 'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.16), transparent 25%), linear-gradient(135deg, #0b2f4f, #0f8b78)' }}
        >
          <h2 className="text-xl font-black md:text-2xl">{L('आज ही अपनी तैयारी शुरू करें', 'Start your preparation today')}</h2>
          <p className="mt-2 text-white/80">{L('मुफ़्त क्विज़ से शुरू करें, फिर अपना कोर्स चुनें।', 'Begin with the free quiz, then choose your course.')}</p>
          <Link href={`/${locale}/login`} className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-extrabold text-navy-900 transition hover:-translate-y-0.5">
            {L('मुफ़्त शुरू करें', 'Start Free')}
          </Link>
        </div>

        {related.length > 0 ? (
          <div className="mt-12">
            <h2 className="mb-4 text-xl font-extrabold text-navy-950">{L('संबंधित लेख', 'Related articles')}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link key={r.id} href={`/${locale}/blog/${r.slug}`} className="rounded-lg border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                  <h3 className="font-extrabold leading-snug text-navy-900 hover:text-orange-600">{hi ? r.titleHi : r.titleEn}</h3>
                  <p className="mt-1 text-xs text-muted">{r.readingMinutes} {L('मिनट पठन', 'min read')}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
