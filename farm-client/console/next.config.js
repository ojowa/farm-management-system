/** @type {import('next').NextConfig} */
const path = require('path');
const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:4000/v1';

const nextConfig = {
  // This app is its own npm project with its own lockfile. Without this Next
  // walks up and picks the repo-root lockfile as the workspace root, tracing
  // build output from the wrong place (and warning about multiple lockfiles).
  outputFileTracingRoot: path.join(__dirname),
  typescript: { ignoreBuildErrors: false },
  async rewrites() {
    return [
      { source: '/auth/:path*', destination: `${gatewayUrl}/auth/:path*` },
      { source: '/api/:path*', destination: `${gatewayUrl}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
