/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Excluir rutas problemáticas del build estático
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.nexfit365.dpdns.org',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'api.nexfit365.dpdns.org',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8001',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
    ],
  },
}

export default nextConfig
