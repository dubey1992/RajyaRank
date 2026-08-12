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
  { path: '/faq', priority: 0.5 },
  { path: '/search', priority: 0.5 },
  { path: '/login', priority: 0.5 },
  { path: '/contact', priority: 0.4 },
  { path: '/request-demo', priority: 0.4 },
  { path: '/terms', priority: 0.3 },
  { path: '/privacy', priority: 0.3 },
  { path: '/refund', priority: 0.3 },
];

interface Ref { id: string }
interface BlogRef { slug: string; updatedAt: string }
interface CurrentAffairRef { id: string; publishedAt: string | null }

function entry(path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE}/en${path}`,
    ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
    changeFrequency: 'weekly',
    priority,
    alternates: { languages: { hi: `${SITE}/hi${path}`, en: `${SITE}/en${path}` } },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => entry(p.path, p.priority));

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
  for (const e of exams ?? []) entries.push(entry(`/exams/${e.id}`, 0.7));
  for (const c of courses ?? []) entries.push(entry(`/courses/${c.id}`, 0.7));
  for (const p of posts ?? []) entries.push(entry(`/blog/${p.slug}`, 0.6, p.updatedAt));
  for (const c of currentAffairs ?? []) entries.push(entry(`/current-affairs/${c.id}`, 0.6, c.publishedAt ?? undefined));

  return entries;
}
