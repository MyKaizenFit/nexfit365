import { NextResponse } from 'next/server'
import { buildServiceWorkerScript, swScope } from '@/lib/sw-script'

export async function GET() {
  const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  const pwaEnabled = (process.env.NEXT_PUBLIC_ENABLE_PWA || '').toLowerCase() === 'true'
  const scope = swScope(rawBasePath)

  return new NextResponse(buildServiceWorkerScript({ pwaEnabled, rawBasePath }), {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': scope,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
