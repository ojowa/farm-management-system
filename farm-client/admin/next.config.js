/** @type {import('next').NextConfig} */
const gatewayUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

const nextConfig = {
  transpilePackages: ['@farm/types', '@farm/validation'],
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
