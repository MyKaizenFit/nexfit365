"use client"

import type { ReactNode } from "react"
import { Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Transición rápida al mostrar contenido cargado */
export function ContentReveal({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("animate-in fade-in duration-200 fill-mode-both", className)}>
      {children}
    </div>
  )
}

/** Skeleton de stat card (grid 2×4 del dashboard) */
export function StatCardSkeleton() {
  return (
    <Card className="relative overflow-hidden border dark:bg-card">
      <div className="absolute top-0 right-0 w-20 h-20 bg-muted/30 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

/** Skeleton de acceso rápido (cards con gradiente) */
export function QuickAccessCardSkeleton({
  className,
}: {
  className?: string
}) {
  return (
    <Card
      className={cn(
        "border-0 overflow-hidden bg-gradient-to-br from-muted/80 to-muted/40",
        className
      )}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-full max-w-[200px]" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
          <Skeleton className="w-20 h-20 rounded-full shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}

/** Hero del dashboard: saludo real + placeholders donde falten datos */
export function DashboardHeroShell({
  greeting,
  userName,
  daysLabel,
  daysLoading,
  motivationalContent,
  actions,
}: {
  greeting: string
  userName: string
  daysLabel?: ReactNode
  daysLoading?: boolean
  motivationalContent: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 p-6 sm:p-8 text-white shadow-2xl">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold truncate">
                  {greeting}, {userName}! 💪
                </h1>
                {daysLoading ? (
                  <Skeleton className="mt-2 h-4 w-48 bg-white/25" />
                ) : (
                  daysLabel
                )}
              </div>
            </div>
          </div>
          {actions}
        </div>

        <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
          {motivationalContent}
        </div>
      </div>
    </div>
  )
}

/** Vista skeleton completa del inicio (Suspense / primera carga) */
export function DashboardHomeSkeleton() {
  return (
    <div className="flex flex-col space-y-6 sm:space-y-8">
      <DashboardHeroShell
        greeting="¡Hola"
        userName="..."
        daysLoading
        motivationalContent={<Skeleton className="h-5 w-full max-w-lg bg-white/25" />}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <QuickAccessCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function SectionHeroSkeleton({
  gradient,
}: {
  gradient: string
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl", gradient)}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="relative z-10 flex items-center gap-3">
        <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/25 shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-48 max-w-full bg-white/25" />
          <Skeleton className="h-4 w-64 max-w-full bg-white/20" />
        </div>
      </div>
      <Skeleton className="relative z-10 mt-6 h-16 w-full rounded-2xl bg-white/15" />
    </div>
  )
}

export function TabsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 p-1 rounded-lg bg-muted/50">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded-md" />
      ))}
    </div>
  )
}

function FormCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function SkeletonMealPlan() {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
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
      </CardContent>
    </Card>
  )
}

export function FeedGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="h-44 w-full rounded-t-lg" />
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function MealsSectionSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <SectionHeroSkeleton gradient="bg-gradient-to-br from-orange-500/90 via-orange-400/90 to-amber-400/90" />
      <TabsSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function WorkoutsSectionSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <SectionHeroSkeleton gradient="bg-gradient-to-br from-purple-500/90 via-violet-500/90 to-indigo-500/90" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ProfileSectionSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeroSkeleton gradient="bg-gradient-to-br from-indigo-500/90 via-blue-500/90 to-purple-500/90" />
      <FormCardSkeleton rows={5} />
      <FormCardSkeleton rows={3} />
      <FormCardSkeleton rows={4} />
    </div>
  )
}

export function DayOneSectionSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeroSkeleton gradient="bg-gradient-to-br from-emerald-500/90 via-teal-400/90 to-cyan-400/90" />
      <TabsSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function WellnessSectionSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeroSkeleton gradient="bg-gradient-to-br from-indigo-500/90 via-purple-400/90 to-pink-400/90" />
      <FormCardSkeleton rows={3} />
    </div>
  )
}

export function MeasurementsSectionSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </CardContent>
      </Card>
      <FormCardSkeleton rows={2} />
    </div>
  )
}

export function AchievementsSectionSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeroSkeleton gradient="bg-gradient-to-br from-yellow-500/90 via-amber-400/90 to-orange-400/90" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <SkeletonMealPlan />
    </div>
  )
}

export function TipsSectionSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeroSkeleton gradient="bg-gradient-to-br from-purple-500/90 via-pink-400/90 to-orange-400/90" />
      <FeedGridSkeleton count={3} />
    </div>
  )
}

export function RecommendationsSectionSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeroSkeleton gradient="bg-gradient-to-br from-amber-500/90 via-pink-400/90 to-sky-400/90" />
      <FeedGridSkeleton count={2} />
    </div>
  )
}

export function SettingsSectionSkeleton() {
  return (
    <div className="space-y-6">
      <FormCardSkeleton rows={2} />
      <FormCardSkeleton rows={3} />
    </div>
  )
}

export function GenericSectionSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeroSkeleton gradient="bg-gradient-to-br from-slate-500/80 via-gray-400/80 to-blue-400/80" />
      <FormCardSkeleton rows={4} />
    </div>
  )
}

/** Wrapper simple para fallbacks de Suspense */
export function DashboardSectionFallback({
  children,
}: {
  children: ReactNode
}) {
  return <>{children}</>
}
