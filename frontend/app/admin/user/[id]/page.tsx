"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/** Legacy route — redirects to user-v2. Kept so deep-links and Next typegen stay valid. */
export default function LegacyAdminUserRedirect() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id

  useEffect(() => {
    if (id) {
      router.replace(`/admin/user-v2/${id}`)
    } else {
      router.replace("/admin")
    }
  }, [id, router])

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Redirigiendo…
    </div>
  )
}
