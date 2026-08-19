import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Content-Security-Policy is set per-request (with a nonce) in middleware.ts,
// so it is intentionally NOT declared here — a second static CSP header would
// conflict with the nonce policy. The remaining headers are safe as static.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // pnpm hoists/symlinks packages into the workspace root's node_modules;
  // without this, Next's standalone-output file tracer roots itself at
  // apps/web and misses those symlinked deps (e.g. `next` itself is absent
  // from the traced output on Amplify's monorepo builds).
  experimental: { outputFileTracingRoot: path.join(__dirname, '../../') },
  transpilePackages: ['@rajyarank/ui', '@rajyarank/i18n', '@rajyarank/contracts'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
export default nextConfig;
