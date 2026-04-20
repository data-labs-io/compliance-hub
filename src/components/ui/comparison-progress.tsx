"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ComparisonProgressProps {
  baselineValue: number    // 0-100, the baseline/previous snapshot score
  currentValue: number     // 0-100, the current/latest snapshot score
  className?: string
}

/**
 * ComparisonProgress - A dual-segment progress bar for comparing baseline vs current scores
 *
 * Visual:
 * - Improvement (current > baseline): Gray segment (baseline) + Green segment (improvement)
 * - Regression (current < baseline): Gray segment (current) + Orange segment (regression)
 * - No change: Gray segment only
 */
const ComparisonProgress = React.forwardRef<
  HTMLDivElement,
  ComparisonProgressProps
>(({ baselineValue, currentValue, className }, ref) => {
  // Clamp values to 0-100
  const baseline = Math.max(0, Math.min(100, baselineValue))
  const current = Math.max(0, Math.min(100, currentValue))

  // Determine if improvement or regression
  const isImprovement = current > baseline
  const isRegression = current < baseline

  // Calculate segment widths
  const baseWidth = Math.min(baseline, current)  // The shared/base portion
  const deltaWidth = Math.abs(current - baseline) // The difference portion

  return (
    <div
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
        className
      )}
    >
      {/* Base segment - always gray, shows the lower of the two values */}
      <div
        className="absolute left-0 top-0 h-full bg-gray-400 dark:bg-gray-500 transition-all duration-300"
        style={{ width: `${baseWidth}%` }}
      />

      {/* Delta segment - green for improvement, orange for regression */}
      {deltaWidth > 0 && (
        <div
          className={cn(
            "absolute top-0 h-full transition-all duration-300",
            isImprovement && "bg-green-400 dark:bg-green-500",
            isRegression && "bg-orange-400 dark:bg-orange-500"
          )}
          style={{
            left: `${baseWidth}%`,
            width: `${deltaWidth}%`
          }}
        />
      )}
    </div>
  )
})

ComparisonProgress.displayName = "ComparisonProgress"

export { ComparisonProgress }
