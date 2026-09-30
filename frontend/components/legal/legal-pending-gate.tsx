'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { appPath, isAppPath } from '@/lib/app-path'
import { getLegalStatus } from '@/lib/legal-service'

const OPEN_PATHS = ['/aceptacion-legal', '/privacidad', '/terminos', '/salud', '/cookies', '/auth']

export function LegalPendingGate() {
  const { user } = useAuth()
  const pathname = usePathname() || '/'
  const router = useRouter()

  useEffect(() => {
    if (!user || user.is_staff || user.is_superuser) return
    if (OPEN_PATHS.some((path) => isAppPath(pathname, path))) return
    let cancelled = false
    getLegalStatus()
      .then((status) => {
        if (!cancelled && status.pending.length > 0) {
          router.replace(appPath('/aceptacion-legal'))
        }
      })
      .catch(() => {
        // A failed status check must not trap the user.
      })
    return () => {
      cancelled = true
    }
  }, [user, pathname, router])

  return null
}
