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
      { source: '/auth/:path*', destination: `${gatewayUrl}/auth/:path*` },
      { source: '/api/:path*', destination: `${gatewayUrl}/api/:path*` },
      { source: '/platform-:path*', destination: `${gatewayUrl}/platform-:path*` },
    ];
  },
};

module.exports = nextConfig;
