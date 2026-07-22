import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only.');

export const upsertBlogPostSchema = z.object({
  slug: slugSchema,
  titleHi: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  excerptHi: z.string().min(1).max(400),
  excerptEn: z.string().min(1).max(400),
  bodyHi: z.string().min(1),
  bodyEn: z.string().min(1),
  category: z.string().min(1).max(60),
  tags: z.array(z.string().min(1).max(40)).max(10).default([]),
  coverImageUrl: z.string().url().max(600).optional(),
  authorName: z.string().min(1).max(120).default('Team RajyaRank'),
  seoTitleHi: z.string().max(70).optional(),
  seoTitleEn: z.string().max(70).optional(),
  seoDescriptionHi: z.string().max(160).optional(),
  seoDescriptionEn: z.string().max(160).optional(),
});
export type UpsertBlogPost = z.infer<typeof upsertBlogPostSchema>;

export interface BlogPostView {
  id: string;
  slug: string;
  titleHi: string;
  titleEn: string;
  excerptHi: string;
  excerptEn: string;
  bodyHi: string;
  bodyEn: string;
  category: string;
  tags: string[];
  coverImageUrl: string | null;
  authorName: string;
  seoTitleHi: string | null;
  seoTitleEn: string | null;
  seoDescriptionHi: string | null;
  seoDescriptionEn: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Computed server-side from body word count (~200 wpm) — not stored. */
  readingMinutes: number;
}

/** Lighter shape returned by the public list endpoint — no full body, since
 *  the index page only ever renders cards, never the article text. */
export type BlogPostSummary = Omit<BlogPostView, 'bodyHi' | 'bodyEn'>;
