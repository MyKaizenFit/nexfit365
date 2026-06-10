"use client"

import type React from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DashboardHomeSkeleton,
  QuickAccessCardSkeleton,
  StatCardSkeleton,
} from "@/components/dashboard/dashboard-skeletons"

export { DashboardHomeSkeleton, QuickAccessCardSkeleton, StatCardSkeleton }

export function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </CardContent>
    </Card>
  )
}

export function SkeletonMacroChart() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <Skeleton className="w-24 h-24 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function SkeletonMealPlan() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function SkeletonProgressPhotos() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative bg-gradient-to-br from-muted/30 to-muted/60 rounded-xl p-4">
          <div className="flex items-center justify-center min-h-[240px]">
            <Skeleton className="w-36 h-48 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-12 h-16 rounded-md" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  }

  return <div className={`loading-spinner ${sizeClasses[size]}`}></div>
}

export function LoadingDots() {
  return <div className="loading-dots"></div>
}

export function LoadingButton({ children, loading = false }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <button
      className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
      disabled={loading}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  )
}
