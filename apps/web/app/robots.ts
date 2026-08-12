import type { MetadataRoute } from 'next';

// NEXT_PUBLIC_ (not WEB_PUBLIC_URL) deliberately: this must be build-time
// inlined, not read from the SSR runtime's process.env — Amplify's
// WEB_COMPUTE platform doesn't reliably propagate app-level env vars into
// the SSR compute layer for monorepo builds (confirmed: static routes like
// this file picked up a WEB_PUBLIC_URL fix correctly, but dynamic/SSR routes
// kept reading the localhost fallback even after a fresh deploy).
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

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
