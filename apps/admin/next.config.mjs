import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Content-Security-Policy is set per-request (with a nonce) in middleware.ts.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // pnpm hoists/symlinks packages into the workspace root's node_modules;
  // without this, Next's standalone-output file tracer roots itself at
  // apps/admin and misses those symlinked deps (e.g. `next` itself is absent
  // from the traced output on Amplify's monorepo builds).
  experimental: { outputFileTracingRoot: path.join(__dirname, '../../') },
  transpilePackages: ['@rajyarank/ui', '@rajyarank/i18n', '@rajyarank/contracts', '@rajyarank/auth'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
export default nextConfig;
