'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, BarChart3, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardMetrics } from '@/stores/dashboard-store'
import { CISControl, CISControlDetail } from '@/frameworks/cis'
import type { PCIDSSRequirement } from '@/frameworks/pci-dss'
import type { NISTCSFFunction } from '@/frameworks/nist-csf'
import { DeltaScoringExplanation } from './DeltaScoringExplanation'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'

interface ComparisonSummaryProps {
  currentMetrics: DashboardMetrics
  previousMetrics: DashboardMetrics
  currentControls: CISControl[]
  previousControls: CISControl[]
  currentSnapshot?: any
  previousSnapshot?: any
  // PCI-DSS Requirements
  currentPciDssRequirements?: PCIDSSRequirement[]
  previousPciDssRequirements?: PCIDSSRequirement[]
  // NIST Functions
  currentNistFunctions?: NISTCSFFunction[]
  previousNistFunctions?: NISTCSFFunction[]
  // Framework selection
  selectedFramework: 'cis-v8' | 'pci-dss' | 'nist' | 'nis2'
}

interface ChangeItem {
  metric: string
  previousValue: string | number
  currentValue: string | number
  delta: string
  isGood: boolean
  isNeutral: boolean
  severity: 'improvement' | 'regression' | 'neutral'
  icon: React.ReactNode
  // Control details for delta scoring explanations
  controlId?: string
  currentControlDetails?: CISControlDetail[]
  previousControlDetails?: CISControlDetail[]
}

export function ComparisonSummary({
  currentMetrics,
  previousMetrics,
  currentControls,
  previousControls,
  currentSnapshot,
  previousSnapshot,
  currentPciDssRequirements,
  previousPciDssRequirements,
  currentNistFunctions,
  previousNistFunctions,
  selectedFramework
}: ComparisonSummaryProps) {
  const [isOpen, setIsOpen] = useState(false) // Default collapsed
  const { isColorBlindMode } = useColorBlindMode()

  const changes: ChangeItem[] = []

  // Overall Compliance Score
  const complianceDelta = currentMetrics.complianceScore - previousMetrics.complianceScore
  if (complianceDelta !== 0) {
    changes.push({
      metric: 'Overall Analysis Improvement Score',
      previousValue: `${previousMetrics.complianceScore.toFixed(1)}%`,
      currentValue: `${currentMetrics.complianceScore.toFixed(1)}%`,
      delta: `${complianceDelta > 0 ? '+' : ''}${complianceDelta.toFixed(1)}%`,
      isGood: complianceDelta > 0,
      isNeutral: false,
      severity: complianceDelta > 0 ? 'improvement' : 'regression',
      icon: complianceDelta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
    })
  }

  // Total Devices
  const devicesDelta = currentMetrics.totalDevices - previousMetrics.totalDevices
  if (devicesDelta !== 0) {
    changes.push({
      metric: 'Total Devices',
      previousValue: previousMetrics.totalDevices,
      currentValue: currentMetrics.totalDevices,
      delta: `${devicesDelta > 0 ? '+' : ''}${devicesDelta}`,
      isGood: devicesDelta > 0,
      isNeutral: false,
      severity: devicesDelta > 0 ? 'improvement' : 'regression',
      icon: devicesDelta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
    })
  }

  // Intent Checks
  const intentDelta = currentMetrics.intentChecksPassed - previousMetrics.intentChecksPassed
  if (intentDelta !== 0) {
    changes.push({
      metric: 'Intent Checks Passed',
      previousValue: previousMetrics.intentChecksPassed,
      currentValue: currentMetrics.intentChecksPassed,
      delta: `${intentDelta > 0 ? '+' : ''}${intentDelta}`,
      isGood: intentDelta > 0,
      isNeutral: false,
      severity: intentDelta > 0 ? 'improvement' : 'regression',
      icon: intentDelta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
    })
  }

  // Active Alerts (reverse polarity - fewer is better)
  const alertsDelta = currentMetrics.activeAlerts - previousMetrics.activeAlerts
  if (alertsDelta !== 0) {
    changes.push({
      metric: 'Active Alerts',
      previousValue: previousMetrics.activeAlerts,
      currentValue: currentMetrics.activeAlerts,
      delta: `${alertsDelta > 0 ? '+' : ''}${alertsDelta}`,
      isGood: alertsDelta < 0, // Fewer alerts is good
      isNeutral: false,
      severity: alertsDelta < 0 ? 'improvement' : 'regression',
      icon: alertsDelta < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />
    })
  }

  // Select controls based on framework
  const currentFrameworkControls = selectedFramework === 'nist'
    ? (currentNistFunctions || [])
    : selectedFramework === 'pci-dss'
      ? (currentPciDssRequirements || [])
      : currentControls

  const previousFrameworkControls = selectedFramework === 'nist'
    ? (previousNistFunctions || [])
    : selectedFramework === 'pci-dss'
      ? (previousPciDssRequirements || [])
      : previousControls

  // Control-level changes
  currentFrameworkControls.forEach(currentControl => {
    const prevControl = previousFrameworkControls.find(c => c.id === currentControl.id)
    if (prevControl) {
      // Calculate percentages
      const prevPercentage = (prevControl.score / prevControl.maxScore) * 100
      const currentPercentage = (currentControl.score / currentControl.maxScore) * 100
      const percentageDelta = currentPercentage - prevPercentage

      if (Math.abs(percentageDelta) >= 0.1) { // Only show if meaningful change
        // Determine metric label based on framework
        const metricLabel = selectedFramework === 'nist'
          ? `Function ${currentControl.id}: ${currentControl.name}`
          : selectedFramework === 'pci-dss'
            ? `Requirement ${currentControl.id}: ${currentControl.name}`
            : `Control ${currentControl.id}: ${currentControl.name}`

        changes.push({
          metric: metricLabel,
          previousValue: `${prevPercentage.toFixed(1)}%`,
          currentValue: `${currentPercentage.toFixed(1)}%`,
          delta: `${percentageDelta > 0 ? '+' : ''}${percentageDelta.toFixed(1)}`,
          isGood: percentageDelta > 0,
          isNeutral: false,
          severity: percentageDelta > 0 ? 'improvement' : 'regression',
          icon: percentageDelta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
          // Include control details for delta scoring explanations
          controlId: currentControl.id,
          currentControlDetails: currentControl.details,
          previousControlDetails: prevControl.details
        })
      }
    }
  })

  // Separate improvements and regressions
  const improvements = changes.filter(c => c.severity === 'improvement')
  const regressions = changes.filter(c => c.severity === 'regression')
  const hasChanges = changes.length > 0

  // Format snapshot names
  const formatSnapshotName = (snapshot: any) => {
    if (!snapshot) return 'Unknown'
    return snapshot.name === snapshot.id
      ? (snapshot.id === '$last' ? 'Latest Snapshot' : snapshot.id.substring(0, 8))
      : snapshot.name
  }

  return (
    <Card className={cn(
      "border-2 transition-colors",
      hasChanges
        ? improvements.length > regressions.length
          ? (isColorBlindMode
              ? "border-accessible-success/30 bg-accessible-success/5 dark:bg-accessible-success/10"
              : "border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30")
          : regressions.length > improvements.length
          ? (isColorBlindMode
              ? "border-accessible-error/30 bg-accessible-error/5 dark:bg-accessible-error/10"
              : "border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30")
          : "border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
        : "border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900 dark:to-gray-800"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-4 flex-1">
              <div className={cn(
                "p-2 rounded-lg",
                hasChanges
                  ? improvements.length > regressions.length
                    ? (isColorBlindMode ? "bg-accessible-success" : "bg-green-600 dark:bg-green-500")
                    : regressions.length > improvements.length
                    ? (isColorBlindMode ? "bg-accessible-error" : "bg-amber-600 dark:bg-amber-500")
                    : "bg-blue-600 dark:bg-blue-500"
                  : "bg-gray-600 dark:bg-gray-500"
              )}>
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <CardTitle className="text-lg">Snapshot Comparison Summary</CardTitle>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">{formatSnapshotName(previousSnapshot)}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-medium">{formatSnapshotName(currentSnapshot)}</span>
                </div>
              </div>

              {/* Overall Compliance Score - Current + Delta */}
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {currentMetrics.complianceScore.toFixed(1)}%
                </div>
                {(() => {
                  const delta = currentMetrics.complianceScore - previousMetrics.complianceScore
                  if (delta === 0) return null
                  const isImprovement = delta > 0
                  return (
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md font-medium text-sm",
                      isColorBlindMode
                        ? isImprovement
                          ? "bg-accessible-success/20 text-accessible-success"
                          : "bg-accessible-error/20 text-accessible-error"
                        : isImprovement
                          ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
                          : "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400"
                    )}>
                      {isColorBlindMode && (
                        isImprovement ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />
                      )}
                      {!isColorBlindMode && (
                        isImprovement ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                      )}
                      {isImprovement ? '+' : ''}{delta.toFixed(1)}
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Quick stats badges */}
              {hasChanges && (
                <div className="flex items-center gap-2">
                  {improvements.length > 0 && (
                    <Badge className={cn(
                      "border flex items-center gap-1",
                      isColorBlindMode
                        ? "bg-accessible-success/20 text-accessible-success border-accessible-success/30"
                        : "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400 border-green-200 dark:border-green-700"
                    )}>
                      {isColorBlindMode && <CheckCircle2 className="h-3 w-3" />}
                      +{improvements.length} improved
                    </Badge>
                  )}
                  {regressions.length > 0 && (
                    <Badge className={cn(
                      "border flex items-center gap-1",
                      isColorBlindMode
                        ? "bg-accessible-error/20 text-accessible-error border-accessible-error/30"
                        : "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-700"
                    )}>
                      {isColorBlindMode && <AlertCircle className="h-3 w-3" />}
                      -{regressions.length} regressed
                    </Badge>
                  )}
                </div>
              )}
              <div className={cn(
                "p-1 rounded-full transition-all duration-200",
                isOpen ? "bg-white dark:bg-gray-800 shadow-sm" : hasChanges
                  ? improvements.length > regressions.length
                    ? "bg-green-100 dark:bg-green-900"
                    : regressions.length > improvements.length
                    ? "bg-amber-100 dark:bg-amber-900"
                    : "bg-blue-100 dark:bg-blue-900"
                  : "bg-gray-100 dark:bg-gray-800"
              )}>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {!hasChanges ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
                <Minus className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">No significant changes detected</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  All metrics remained stable between snapshots
                </p>
              </div>
            ) : (
              <>
                {/* Summary Stats - KPI Card Style */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Total Changes */}
                  <Card className="relative overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Changes</CardTitle>
                        <div className="rounded-lg p-2 bg-sky-500 bg-opacity-10 dark:bg-sky-400/20">
                          <BarChart3 className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold dark:text-gray-100">{changes.length}</p>
                    </CardContent>
                  </Card>

                  {/* Improvements */}
                  <Card className="relative overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Improvements</CardTitle>
                        <div className={cn(
                          "rounded-lg p-2",
                          isColorBlindMode ? "bg-accessible-success/10 dark:bg-accessible-success/20" : "bg-green-500 bg-opacity-10 dark:bg-green-400/20"
                        )}>
                          <TrendingUp className={cn("h-5 w-5", isColorBlindMode ? "text-accessible-success" : "text-green-500 dark:text-green-400")} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className={cn("text-2xl font-bold", isColorBlindMode ? "text-accessible-success" : "text-green-600 dark:text-green-400")}>{improvements.length}</p>
                    </CardContent>
                  </Card>

                  {/* Regressions */}
                  <Card className="relative overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Regressions</CardTitle>
                        <div className={cn(
                          "rounded-lg p-2",
                          isColorBlindMode ? "bg-accessible-error/10 dark:bg-accessible-error/20" : "bg-amber-500 bg-opacity-10 dark:bg-amber-400/20"
                        )}>
                          <TrendingDown className={cn("h-5 w-5", isColorBlindMode ? "text-accessible-error" : "text-amber-500 dark:text-amber-400")} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className={cn("text-2xl font-bold", isColorBlindMode ? "text-accessible-error" : "text-amber-600 dark:text-amber-400")}>{regressions.length}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Improvements Section */}
                {improvements.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-2">
                      <CheckCircle2 className={cn("h-5 w-5", isColorBlindMode ? "text-accessible-success" : "text-green-600 dark:text-green-400")} />
                      <h4 className={cn("font-semibold text-base", isColorBlindMode ? "text-accessible-success" : "text-green-900 dark:text-green-300")}>Improvements</h4>
                      <div className={cn("h-px flex-1 bg-gradient-to-r to-transparent", isColorBlindMode ? "from-accessible-success/30" : "from-green-200 dark:from-green-700/30")}></div>
                    </div>
                    <div className="space-y-2">
                      {improvements.map((change, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={cn("p-2 rounded-lg", isColorBlindMode ? "bg-accessible-success/20 dark:bg-accessible-success/30" : "bg-green-100 dark:bg-green-900/50")}>
                                <div className={cn(isColorBlindMode ? "text-accessible-success" : "text-green-700 dark:text-green-400")}>{change.icon}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{change.metric}</div>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-base font-bold",
                                    isColorBlindMode
                                      ? "text-accessible-success"
                                      : "text-green-700 dark:text-green-400"
                                  )}>
                                    {change.currentValue}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge className={cn(
                              "text-white border-0 text-sm px-3 py-1 flex items-center gap-1",
                              isColorBlindMode ? "bg-accessible-success" : "bg-green-600 dark:bg-green-500"
                            )}>
                              {isColorBlindMode && <CheckCircle2 className="h-3 w-3" />}
                              {change.delta}
                            </Badge>
                          </div>

                          {/* Delta Scoring Explanation for improvements */}
                          {change.controlId && change.currentControlDetails && change.previousControlDetails && (
                            <DeltaScoringExplanation
                              controlId={change.controlId}
                              currentDetails={change.currentControlDetails}
                              previousDetails={change.previousControlDetails}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regressions Section */}
                {regressions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-2">
                      <AlertCircle className={cn("h-5 w-5", isColorBlindMode ? "text-accessible-error" : "text-amber-600 dark:text-amber-400")} />
                      <h4 className={cn("font-semibold text-base", isColorBlindMode ? "text-accessible-error" : "text-amber-900 dark:text-amber-300")}>Regressions</h4>
                      <div className={cn("h-px flex-1 bg-gradient-to-r to-transparent", isColorBlindMode ? "from-accessible-error/30" : "from-amber-200 dark:from-amber-700/30")}></div>
                    </div>
                    <div className="space-y-2">
                      {regressions.map((change, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={cn("p-2 rounded-lg", isColorBlindMode ? "bg-accessible-error/20 dark:bg-accessible-error/30" : "bg-amber-100 dark:bg-amber-900/50")}>
                                <div className={cn(isColorBlindMode ? "text-accessible-error" : "text-amber-700 dark:text-amber-400")}>{change.icon}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{change.metric}</div>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-base font-bold",
                                    isColorBlindMode
                                      ? "text-accessible-error"
                                      : "text-amber-700 dark:text-amber-400"
                                  )}>
                                    {change.currentValue}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge className={cn(
                              "text-white border-0 text-sm px-3 py-1 flex items-center gap-1",
                              isColorBlindMode ? "bg-accessible-error" : "bg-amber-600 dark:bg-amber-500"
                            )}>
                              {isColorBlindMode && <AlertCircle className="h-3 w-3" />}
                              {change.delta}
                            </Badge>
                          </div>

                          {/* Delta Scoring Explanation for regressions */}
                          {change.controlId && change.currentControlDetails && change.previousControlDetails && (
                            <DeltaScoringExplanation
                              controlId={change.controlId}
                              currentDetails={change.currentControlDetails}
                              previousDetails={change.previousControlDetails}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
