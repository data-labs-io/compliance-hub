const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,

  // Use assetPrefix only when running as an IP Fabric extension.
  // This ensures Next.js loads chunks and css from the extension path.
  // IMPORTANT: this MUST match the slug the extension is deployed under in
  // IP Fabric (the "/extensions-apps/<slug>" URL). assetPrefix is baked in at
  // build time, so set IPF_EXTENSION_SLUG as a Docker build arg if you ever
  // deploy under a different slug. Default matches the "compliance-hub" slug.
  assetPrefix: process.env.IS_IPF_EXTENSION === 'true'
    ? `/extensions-apps/${process.env.IPF_EXTENSION_SLUG || 'compliance-hub'}`
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