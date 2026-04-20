'use client'

import React, { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Info, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { MissingDataWarning, DataAvailabilitySummary } from '@/types/data-availability'

interface MissingDataAlertProps {
  dataAvailability: DataAvailabilitySummary
  onDismiss?: () => void
  className?: string
}

export function MissingDataAlert({ dataAvailability, onDismiss, className = '' }: MissingDataAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed || dataAvailability.completeData) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const severityColors = {
    high: 'border-red-500 bg-red-50',
    medium: 'border-orange-500 bg-orange-50',
    low: 'border-yellow-500 bg-yellow-50'
  }

  const severityIcons = {
    high: 'text-red-600',
    medium: 'text-orange-600',
    low: 'text-yellow-600'
  }

  const confidenceColors = {
    high: 'text-green-600',
    medium: 'text-orange-600',
    low: 'text-red-600'
  }

  return (
    <Alert className={`relative ${className} ${severityColors[dataAvailability.confidenceLevel]}`}>
      <AlertTriangle className={`h-4 w-4 ${severityIcons[dataAvailability.confidenceLevel]}`} />

      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-gray-200 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <AlertTitle className="flex items-center gap-2">
        Limited Data Available
        <span className={`text-sm font-normal ${confidenceColors[dataAvailability.confidenceLevel]}`}>
          ({dataAvailability.confidenceLevel} confidence)
        </span>
      </AlertTitle>

      <AlertDescription>
        <div className="mt-2">
          <p className="text-sm mb-2">
            Some API endpoints are unavailable. Metrics may not reflect actual network state.
          </p>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {isExpanded ? 'Hide' : 'Show'} details ({dataAvailability.missingDataSources.length} missing data sources)
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-2">
              <div className="border-l-2 border-gray-300 pl-3">
                <h4 className="font-medium text-sm mb-2">Missing Data Sources:</h4>

                {dataAvailability.missingDataSources.map((warning, index) => (
                  <div key={index} className="mb-3 pb-3 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-start gap-2">
                      <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                        warning.severity === 'high' ? 'bg-red-500' :
                        warning.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                      }`} />

                      <div className="flex-1">
                        <div className="font-medium text-sm">{warning.dataType}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Endpoint:</span> {warning.endpoint}
                        </div>
                        <div className="text-xs text-gray-700 mt-1">
                          <span className="font-medium">Impact:</span> {warning.impact}
                        </div>
                        {warning.recommendation && (
                          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            {warning.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="font-medium text-sm mb-2">Affected Metrics:</h4>
                <div className="flex flex-wrap gap-2">
                  {dataAvailability.affectedMetrics.map((metric, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded-md"
                    >
                      {metric}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  <strong>Overall Impact:</strong> {dataAvailability.overallImpact}
                </p>
              </div>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Simplified version for inline warnings
export function InlineDataWarning({
  message,
  severity = 'medium'
}: {
  message: string
  severity?: 'low' | 'medium' | 'high'
}) {
  const colors = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-orange-600 bg-orange-50',
    low: 'text-yellow-600 bg-yellow-50'
  }

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${colors[severity]}`}>
      <AlertTriangle className="h-3 w-3" />
      <span>{message}</span>
    </div>
  )
}