import type { MetadataRoute } from 'next';

const SITE = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';

/** Public marketing/discovery pages are indexable; authenticated student
 *  surfaces are disallowed (wildcards cover both /hi/* and /en/* prefixes). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/*/dashboard',
          '/*/account',
          '/*/onboarding',
          '/*/notifications',
          '/*/doubts',
          '/*/learn',
          '/*/tests',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
