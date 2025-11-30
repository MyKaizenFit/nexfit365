"use client"

import { ProgressDashboard } from "@/components/dashboard/progress-dashboard"

export default function ProgressPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4">
      <div className="max-w-7xl mx-auto">
        <ProgressDashboard />
      </div>
    </div>
  )
}
