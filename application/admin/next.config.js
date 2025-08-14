/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove experimental.appDir as it's now default in Next.js 14
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  async rewrites() {
    return [
      {
        source: '/admin/:path*',
        destination: '/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
