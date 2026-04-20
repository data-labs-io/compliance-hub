'use client'

import { ArrowRight, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'

interface DeltaIndicatorProps {
  previousValue: number | null
  currentValue: number | null
  unit?: string
  isPercentage?: boolean
  reversePolarity?: boolean // When true, decreasing is good (like errors, telnet usage)
  size?: 'sm' | 'md' | 'lg'
  showArrow?: boolean
  showTrend?: boolean
}

export function DeltaIndicator({
  previousValue,
  currentValue,
  unit = '',
  isPercentage = false,
  reversePolarity = false,
  size = 'md',
  showArrow = true,
  showTrend = false
}: DeltaIndicatorProps) {
  const { isColorBlindMode } = useColorBlindMode()

  // Handle null values
  if (previousValue === null || currentValue === null) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-500 dark:text-gray-400">Cannot compare (data unavailable)</span>
      </div>
    )
  }

  const delta = currentValue - previousValue
  const isPositive = delta > 0
  const isNegative = delta < 0
  const isNeutral = delta === 0

  // Determine if the change is "good" or "bad"
  // For normal metrics (devices, sites, policies), increase is good
  // For reverse polarity (errors, telnet), decrease is good
  const isGoodChange = reversePolarity
    ? (isNegative || isNeutral)  // Decrease or no change is good for errors
    : (isPositive || isNeutral)  // Increase or no change is good for normal metrics

  const formatValue = (val: number) => {
    if (isPercentage) return `${val.toFixed(1)}%`
    // For integers, show no decimals. For decimals, show 1 decimal place.
    const formatted = Number.isInteger(val) ? val.toString() : val.toFixed(1)
    return `${formatted}${unit}`
  }

  const sizeClasses = {
    sm: {
      text: 'text-xs',
      arrow: 'h-3 w-3',
      values: 'text-sm',
      delta: 'text-xs'
    },
    md: {
      text: 'text-sm',
      arrow: 'h-4 w-4',
      values: 'text-base',
      delta: 'text-sm'
    },
    lg: {
      text: 'text-base',
      arrow: 'h-5 w-5',
      values: 'text-lg',
      delta: 'text-base'
    }
  }

  const sizes = sizeClasses[size]

  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-lg px-3 py-2 border",
      isGoodChange && !isNeutral && (isColorBlindMode ? "bg-accessible-success/10 border-accessible-success/30" : "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700"),
      !isGoodChange && !isNeutral && (isColorBlindMode ? "bg-accessible-error/10 border-accessible-error/30" : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700"),
      isNeutral && "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    )}>
      {/* Previous Value */}
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Before</span>
        <span className={cn("font-semibold text-gray-700 dark:text-gray-300", sizes.values)}>
          {formatValue(previousValue)}
        </span>
      </div>

      {/* Arrow */}
      {showArrow && (
        <ArrowRight className={cn(
          sizes.arrow,
          isGoodChange && !isNeutral && (isColorBlindMode ? "text-accessible-success" : "text-green-600"),
          !isGoodChange && !isNeutral && (isColorBlindMode ? "text-accessible-error" : "text-amber-600"),
          isNeutral && "text-gray-400"
        )} />
      )}

      {/* Current Value */}
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">After</span>
        <span className={cn("font-semibold", sizes.values,
          isGoodChange && !isNeutral && (isColorBlindMode ? "text-accessible-success" : "text-green-700 dark:text-green-400"),
          !isGoodChange && !isNeutral && (isColorBlindMode ? "text-accessible-error" : "text-amber-700 dark:text-amber-400"),
          isNeutral && "text-gray-700 dark:text-gray-300"
        )}>
          {formatValue(currentValue)}
        </span>
      </div>

      {/* Delta Badge */}
      <div className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md font-medium",
        sizes.delta,
        isGoodChange && !isNeutral && (isColorBlindMode ? "bg-accessible-success/20 text-accessible-success" : "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400"),
        !isGoodChange && !isNeutral && (isColorBlindMode ? "bg-accessible-error/20 text-accessible-error" : "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400"),
        isNeutral && "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
      )}>
        {/* Colorblind mode: always show status icons */}
        {isColorBlindMode && (
          <>
            {isGoodChange && !isNeutral && <CheckCircle2 className="h-3 w-3" />}
            {!isGoodChange && !isNeutral && <XCircle className="h-3 w-3" />}
            {isNeutral && <Minus className="h-3 w-3" />}
          </>
        )}
        {/* Normal mode: optional trend icons */}
        {!isColorBlindMode && showTrend && !isNeutral && (
          <>
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
          </>
        )}
        {!isColorBlindMode && isNeutral && <Minus className="h-3 w-3" />}
        <span>
          {isPositive && '+'}
          {formatValue(Math.abs(delta))}
        </span>
      </div>
    </div>
  )
}

interface CompactDeltaIndicatorProps {
  previousValue: number | null
  currentValue: number | null
  unit?: string
  isPercentage?: boolean
  reversePolarity?: boolean
}

export function CompactDeltaIndicator({
  previousValue,
  currentValue,
  unit = '',
  isPercentage = false,
  reversePolarity = false
}: CompactDeltaIndicatorProps) {
  const { isColorBlindMode } = useColorBlindMode()

  // Handle null values
  if (previousValue === null || currentValue === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Minus className="h-3 w-3" />
        N/A
      </span>
    )
  }

  const delta = currentValue - previousValue
  const isPositive = delta > 0
  const isNegative = delta < 0
  const isNeutral = delta === 0

  const isGoodChange = reversePolarity
    ? (isNegative || isNeutral)
    : (isPositive || isNeutral)

  const formatValue = (val: number) => {
    if (isPercentage) return `${val.toFixed(1)}%`
    // For integers, show no decimals. For decimals, show 1 decimal place.
    const formatted = Number.isInteger(val) ? val.toString() : val.toFixed(1)
    return `${formatted}${unit}`
  }

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Minus className="h-3 w-3" />
        No change
      </span>
    )
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium",
      isGoodChange
        ? (isColorBlindMode ? "text-accessible-success" : "text-green-700 dark:text-green-400")
        : (isColorBlindMode ? "text-accessible-error" : "text-amber-700 dark:text-amber-400")
    )}>
      {/* Colorblind mode: show status icons */}
      {isColorBlindMode ? (
        isGoodChange ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />
      ) : (
        isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
      )}
      {isPositive && '+'}
      {formatValue(Math.abs(delta))}
    </span>
  )
}
