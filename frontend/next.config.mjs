/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite usar un directorio de build alternativo en local cuando `.next`
  // tiene permisos restrictivos (por ejemplo, builds hechos como root).
  // En producción sigue usando `.next` por defecto.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
