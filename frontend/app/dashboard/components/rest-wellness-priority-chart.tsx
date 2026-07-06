"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { RestWellnessRankedCategory } from "@/lib/rest-wellness/types"

interface Props {
  ranked: RestWellnessRankedCategory[]
}

const MAX_SCALE = 15

export function RestWellnessPriorityChart({ ranked }: Props) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimated(true), 60)
    return () => window.clearTimeout(timer)
  }, [ranked])

  return (
    <div className="space-y-3">
      {ranked.map((category) => {
        const pct = Math.min(100, (category.score / MAX_SCALE) * 100)
        return (
          <div key={category.key} className="flex items-center gap-3">
            <div className="w-32 shrink-0 text-xs font-semibold text-muted-foreground">
              {category.emoji} {category.name}
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: animated ? `${pct}%` : "0%",
                  backgroundColor: category.tier.color,
                }}
              />
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                color: category.tier.color,
                backgroundColor: `${category.tier.color}22`,
              }}
            >
              {category.score}
            </span>
          </div>
        )
      })}
    </div>
  )
}

interface OptionButtonProps {
  selected: boolean
  emoji: string
  label: string
  onClick: () => void
}

function OptionButton({ selected, emoji, label, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border-2 p-5 text-center transition-all",
        selected
          ? "border-transparent bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-lg"
          : "border-transparent bg-muted hover:bg-muted/80",
      )}
    >
      <span className="mb-2 block text-3xl">{emoji}</span>
      <span className="text-sm font-bold">{label}</span>
    </button>
  )
}

export { OptionButton }
