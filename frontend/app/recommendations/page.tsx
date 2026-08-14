"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { RecommendationsSection } from "@/components/recommendations/recommendations-section"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { canShowCommercialUpsellForUser } from "@/lib/premium-cta"

export default function RecommendationsPage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()
  const showCommercialUpsell = canShowCommercialUpsellForUser(user, !isLoading)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !showCommercialUpsell) {
      router.replace("/dashboard")
    }
  }, [isLoading, isAuthenticated, showCommercialUpsell, router])

  if (isLoading || !showCommercialUpsell) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 py-8">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <Suspense
          fallback={
            <div className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-[600px] w-full" />
            </div>
          }
        >
          <RecommendationsSection />
        </Suspense>
      </main>
    </div>
  )
}
