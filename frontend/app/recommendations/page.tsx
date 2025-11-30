"use client"

import { Suspense } from "react"
import { RecommendationsSection } from "@/components/recommendations/recommendations-section"
import { Skeleton } from "@/components/ui/skeleton"

export default function RecommendationsPage() {
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

