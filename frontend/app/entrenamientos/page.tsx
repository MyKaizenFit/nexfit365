"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Legacy route — send users to the dashboard workouts section. */
export default function EntrenamientosPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard?section=workouts-3")
  }, [router])

  return null
}
