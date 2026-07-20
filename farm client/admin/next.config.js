/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@farm/types', '@farm/validation'],
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.example.com',
      },
    ],
  },
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
