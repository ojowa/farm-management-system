/** @type {import('next').NextConfig} */
const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:4000';

const nextConfig = {
  transpilePackages: [],
  typescript: { ignoreBuildErrors: false },
  async rewrites() {
    return [
      { source: '/auth/:path*', destination: `${gatewayUrl}/auth/:path*` },
      { source: '/api/:path*', destination: `${gatewayUrl}/api/:path*` },
      { source: '/platform-:path*', destination: `${gatewayUrl}/platform-:path*` },
    ];
  },
};

module.exports = nextConfig;
