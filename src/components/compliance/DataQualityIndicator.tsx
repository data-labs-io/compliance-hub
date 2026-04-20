'use client'

import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Shield, AlertTriangle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

interface DataQualityIndicatorProps {
  confidence: ConfidenceLevel
  apiAvailable?: boolean
  dataSource?: string
  missingDataImpact?: string
  size?: 'sm' | 'md'
}

export function DataQualityIndicator({
  confidence,
  apiAvailable = true,
  dataSource,
  missingDataImpact,
  size = 'sm'
}: DataQualityIndicatorProps) {
  const { isColorBlindMode } = useColorBlindMode()

  const config = {
    high: {
      label: 'High Confidence',
      color: isColorBlindMode
        ? 'bg-accessible-success/20 text-accessible-success border-accessible-success/30'
        : 'bg-green-100 text-green-800 border-green-200',
      icon: Shield,
      iconColor: isColorBlindMode ? 'text-accessible-success' : 'text-green-600',
      description: 'Data from verified API sources with complete coverage'
    },
    medium: {
      label: 'Medium Confidence',
      color: isColorBlindMode
        ? 'bg-accessible-warning/20 text-accessible-warning border-accessible-warning/30'
        : 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: AlertCircle,
      iconColor: isColorBlindMode ? 'text-accessible-warning' : 'text-yellow-600',
      description: 'Data from API sources with partial coverage or calculated estimates'
    },
    low: {
      label: 'Low Confidence',
      color: isColorBlindMode
        ? 'bg-accessible-error/20 text-accessible-error border-accessible-error/30'
        : 'bg-red-100 text-red-800 border-red-200',
      icon: AlertTriangle,
      iconColor: isColorBlindMode ? 'text-accessible-error' : 'text-red-600',
      description: 'Limited data availability or estimated values - verify manually'
    }
  }

  const { label, color, icon: Icon, iconColor, description } = config[confidence]

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1'
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Badge className={cn('border font-medium', color, sizeClasses[size])}>
        <Icon className={cn('h-2.5 w-2.5 mr-1', iconColor)} />
        {label}
      </Badge>
      <InfoTooltip
        title="Data Quality"
        content={
          <div className="space-y-2">
            <p className="text-xs">{description}</p>
            {!apiAvailable && (
              <p className={cn("text-xs mt-2", isColorBlindMode ? "text-accessible-error" : "text-red-600")}>
                <strong>API Unavailable:</strong> {missingDataImpact || 'Some features may be limited'}
              </p>
            )}
            {dataSource && (
              <p className="text-[10px] text-gray-400 mt-2 font-mono">
                Source: {dataSource}
              </p>
            )}
          </div>
        }
        iconClassName="h-3 w-3 text-gray-400"
      />
    </div>
  )
}

/**
 * Helper function to determine confidence level based on data availability
 */
export function calculateConfidence(params: {
  apiAvailable: boolean
  dataComplete: boolean
  calculatedValues?: boolean
}): ConfidenceLevel {
  const { apiAvailable, dataComplete, calculatedValues = false } = params

  if (apiAvailable && dataComplete && !calculatedValues) {
    return 'high'
  }

  if (apiAvailable && (dataComplete || calculatedValues)) {
    return 'medium'
  }

  return 'low'
}
