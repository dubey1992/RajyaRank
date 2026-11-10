import type { MetadataRoute } from 'next';
import { apiFetchServer } from '@/lib/api';

// NEXT_PUBLIC_ deliberately, not WEB_PUBLIC_URL — see the comment in robots.ts.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** Static, always-indexable routes. */
const STATIC_PATHS: { path: string; priority: number }[] = [
  { path: '', priority: 1 },
  { path: '/exams', priority: 0.9 },
  { path: '/courses', priority: 0.9 },
  { path: '/current-affairs', priority: 0.8 },
  { path: '/pricing', priority: 0.8 },
  { path: '/blog', priority: 0.8 },
  { path: '/pyq', priority: 0.7 },
  { path: '/exam-notices', priority: 0.7 },
  { path: '/faq', priority: 0.5 },
  { path: '/login', priority: 0.5 },
  { path: '/signup', priority: 0.5 },
  { path: '/contact', priority: 0.4 },
  { path: '/request-demo', priority: 0.4 },
  { path: '/terms', priority: 0.3 },
  { path: '/privacy', priority: 0.3 },
  { path: '/refund', priority: 0.3 },
  // /search deliberately NOT listed — search/page.tsx sets `robots: {index:
  // false}` (it's a query-driven utility page, not indexable content), and
  // listing a noindex page in the sitemap is a direct contradictory signal
  // (this exact combination showed up as a Search Console "Duplicate,
  // Google chose different canonical" / soft-404 pairing).
];

interface Ref { id: string }
interface BlogRef { slug: string; updatedAt: string }
interface CurrentAffairRef { id: string; publishedAt: string | null }

/** One sitemap <url> entry per language, each carrying BOTH languages as
 *  reciprocal hreflang alternates (including itself, per Google's hreflang
 *  sitemap guidance). Previously this emitted only the /en URL as the <loc>,
 *  with /hi mentioned solely inside that one entry's alternates — the /hi
 *  page never appeared as its own primary sitemap entry at all. For a site
 *  whose whole positioning is Hindi-native (not English-with-a-toggle),
 *  that under-signals the Hindi pages to Google. Returns two entries. */
function entries(path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap {
  const languages = { hi: `${SITE}/hi${path}`, en: `${SITE}/en${path}` };
  return (['en', 'hi'] as const).map((locale) => ({
    url: languages[locale],
    ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
    changeFrequency: 'weekly' as const,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const result: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((p) => entries(p.path, p.priority));

  // Dynamic exam + course + blog post + current-affairs URLs (best-effort —
  // skipped if the API is unreachable at build).
  const [exams, courses, posts, currentAffairs] = await Promise.all([
    apiFetchServer<Ref[]>('/exams', ''),
    apiFetchServer<Ref[]>('/courses', ''),
    apiFetchServer<BlogRef[]>('/blog', ''),
    // The feed endpoint (/current-affairs) caps at 40 most-recent items for
    // the live page; sitemap-ids is unbounded so older published items don't
    // silently age out of the sitemap while their detail pages stay live.
    apiFetchServer<CurrentAffairRef[]>('/current-affairs/sitemap-ids', ''),
  ]);
  for (const e of exams ?? []) result.push(...entries(`/exams/${e.id}`, 0.7));
  for (const c of courses ?? []) result.push(...entries(`/courses/${c.id}`, 0.7));
  for (const p of posts ?? []) result.push(...entries(`/blog/${p.slug}`, 0.6, p.updatedAt));
  for (const c of currentAffairs ?? []) result.push(...entries(`/current-affairs/${c.id}`, 0.6, c.publishedAt ?? undefined));

  return result;
}
