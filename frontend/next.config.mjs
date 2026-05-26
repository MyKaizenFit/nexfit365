/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita bucles en dev: Django usa slash final en API y Next intentaba quitarlo
  // antes de aplicar el rewrite hacia el backend.
  skipTrailingSlashRedirect: true,

  async headers() {
    return [
      {
        source: '/dashboard/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/auth/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/initial-registration/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ]
  },

  // Proxy de API solo en desarrollo (en producción se usa api.nexfit365.dpdns.org directamente)
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return []
    }

    const backendUrl = process.env.NEXT_INTERNAL_API_URL || 'http://backend:8000'
    return [
      {
        source: '/api/:path(.*)',
        destination: `${backendUrl}/api/:path`,
      },
      {
        source: '/media/:path(.*)',
        destination: `${backendUrl}/media/:path`,
      },
    ]
  },

  // Permite usar un directorio de build alternativo en local cuando `.next`
  // tiene permisos restrictivos (por ejemplo, builds hechos como root).
  // En producción sigue usando `.next` por defecto.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Excluir rutas problemáticas del build estático
  // Generar BuildId único para forzar nuevos hashes de chunks
  generateBuildId: async () => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return `build-${timestamp}-${random}`
  },
  images: {
    unoptimized: true,
    qualities: [75, 85, 100],
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
        port: '8000',
        pathname: '/media/**',
      },
    ],
  },
}

export default nextConfig
