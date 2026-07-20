/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@farm/types', '@farm/validation'],
  experimental: {},
};

module.exports = nextConfig;
