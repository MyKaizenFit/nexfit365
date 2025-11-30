"use client"

import type React from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function SkeletonCard() {
  return (
    <Card className="card-loading">
      <CardHeader className="space-y-2">
        <div className="skeleton h-5 w-3/4"></div>
        <div className="skeleton h-4 w-1/2"></div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="skeleton h-20 w-full"></div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-full"></div>
          <div className="skeleton h-4 w-5/6"></div>
          <div className="skeleton h-4 w-4/6"></div>
        </div>
      </CardContent>
    </Card>
  )
}

export function SkeletonMacroChart() {
  return (
    <Card className="card-loading">
      <CardHeader>
        <div className="skeleton h-6 w-48"></div>
        <div className="skeleton h-4 w-64"></div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Círculos skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <div
                className="w-24 h-24 rounded-full skeleton loading-breathe"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
              <div className="skeleton h-4 w-16"></div>
              <div className="skeleton h-3 w-12"></div>
            </div>
          ))}
        </div>

        {/* Barras skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="skeleton h-4 w-20"></div>
                <div className="skeleton h-4 w-16"></div>
              </div>
              <div className="loading-progress"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function SkeletonMealPlan() {
  return (
    <Card className="card-loading">
      <CardHeader>
        <div className="skeleton h-6 w-40"></div>
        <div className="skeleton h-4 w-56"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 fade-in-stagger">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full skeleton loading-pulse"></div>
                <div className="space-y-1">
                  <div className="skeleton h-4 w-24"></div>
                  <div className="skeleton h-3 w-32"></div>
                </div>
              </div>
              <div className="skeleton h-4 w-16"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function SkeletonProgressPhotos() {
  return (
    <Card className="card-loading">
      <CardHeader>
        <div className="skeleton h-6 w-36"></div>
        <div className="skeleton h-4 w-32"></div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Foto principal skeleton */}
        <div className="relative bg-gradient-to-br from-muted/30 to-muted/60 rounded-xl p-4">
          <div className="flex items-center justify-center min-h-[240px]">
            <div className="w-36 h-48 rounded-lg skeleton loading-breathe"></div>
          </div>
        </div>

        {/* Info skeleton */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="skeleton h-4 w-4 rounded"></div>
            <div className="skeleton h-4 w-20"></div>
            <div className="skeleton h-5 w-12 rounded-full"></div>
          </div>
          <div className="skeleton h-4 w-16"></div>
        </div>

        {/* Miniaturas skeleton */}
        <div className="flex gap-2 justify-center">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-12 h-16 rounded-md skeleton loading-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            ></div>
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
