import type { MetadataRoute } from 'next';
import { apiFetchServer } from '@/lib/api';

const SITE = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';

/** Static, always-indexable routes. */
const STATIC_PATHS: { path: string; priority: number }[] = [
  { path: '', priority: 1 },
  { path: '/exams', priority: 0.9 },
  { path: '/current-affairs', priority: 0.8 },
  { path: '/pricing', priority: 0.8 },
  { path: '/blog', priority: 0.8 },
  { path: '/login', priority: 0.5 },
];

interface Ref { id: string }
interface BlogRef { slug: string; updatedAt: string }

function entry(path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE}/hi${path}`,
    ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
    changeFrequency: 'weekly',
    priority,
    alternates: { languages: { hi: `${SITE}/hi${path}`, en: `${SITE}/en${path}` } },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => entry(p.path, p.priority));

  // Dynamic exam + course + blog post URLs (best-effort — skipped if the API is unreachable at build).
  const [exams, courses, posts] = await Promise.all([
    apiFetchServer<Ref[]>('/exams', ''),
    apiFetchServer<Ref[]>('/courses', ''),
    apiFetchServer<BlogRef[]>('/blog', ''),
  ]);
  for (const e of exams ?? []) entries.push(entry(`/exams/${e.id}`, 0.7));
  for (const c of courses ?? []) entries.push(entry(`/courses/${c.id}`, 0.7));
  for (const p of posts ?? []) entries.push(entry(`/blog/${p.slug}`, 0.6, p.updatedAt));

  return entries;
}
