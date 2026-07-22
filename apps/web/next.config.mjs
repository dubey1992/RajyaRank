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
  transpilePackages: ['@rajyarank/ui', '@rajyarank/i18n', '@rajyarank/contracts'],
  async rewrites() {
    return [{ source: '/', destination: '/hi' }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
export default nextConfig;
