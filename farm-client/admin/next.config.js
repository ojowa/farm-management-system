/** @type {import('next').NextConfig} */
const path = require('path');
const gatewayUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

const nextConfig = {
  // This app is its own npm project with its own lockfile. Without this Next
  // walks up and picks the repo-root lockfile as the workspace root, tracing
  // build output from the wrong place (and warning about multiple lockfiles).
  outputFileTracingRoot: path.join(__dirname),
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      // Proxy the whole /v1 API onto this origin. The browser then talks to a
      // single host, so the auth cookie the API sets is first-party — it lands
      // on this host (which src/middleware.ts guards on) instead of on the API
      // host, where the browser would treat it as a third-party cookie.
      { source: '/v1/:path*', destination: `${gatewayUrl}/:path*` },
      { source: '/auth/:path*', destination: `${gatewayUrl}/auth/:path*` },
      { source: '/api/:path*', destination: `${gatewayUrl}/api/:path*` },
      { source: '/platform-:path(.*)', destination: `${gatewayUrl}/platform-:path*` },
    ];
  },
};

module.exports = nextConfig;
