const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  // Use assetPrefix only when running as an IP Fabric extension
  // This ensures Next.js loads chunks and css from the extension path
  assetPrefix: process.env.IS_IPF_EXTENSION === 'true'
    ? '/extensions-apps/fabric-pulse'
    : '',

  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],

  // API route rewrites
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig