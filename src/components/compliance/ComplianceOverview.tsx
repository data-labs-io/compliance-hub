'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ComparisonProgress } from '@/components/ui/comparison-progress'
import { Button } from '@/components/ui/button'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { ArrowRight, Shield, AlertCircle, CheckCircle2, XCircle, ChevronDown, ChevronRight, Info, Activity, Target, BookOpen, Database, FileCode, Lightbulb, CheckSquare, Loader2, ExternalLink, Network } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getNavigationPath } from '@/lib/navigation'
import { cn, formatPercentage } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardMetrics } from '@/stores/dashboard-store'
import { CISControl } from '@/frameworks/cis'
import { PCIDSSRequirement, PCIDSSSubRequirementDetail } from '@/frameworks/pci-dss'
import { getRequirementDescription } from '@/frameworks/pci-dss/descriptions'
import type { NISTCSFFunction } from '@/frameworks/nist-csf'
import { getNISTCSFDescription } from '@/frameworks/nist-csf/descriptions'
import type { NIS2Article } from '@/frameworks/nis2'
import { getNIS2Description } from '@/frameworks/nis2/descriptions'
import { frameworkRegistry } from '@/frameworks/shared'
import { DeltaIndicator, CompactDeltaIndicator } from './DeltaIndicator'
import { getControlDescription } from '@/frameworks/cis/descriptions'
import { useIPFabricURL } from '@/hooks/useIPFabricURL'
import { buildIPFabricGuiUrl, buildIPFabricUrl } from '@/lib/ipfabric-url-helpers'
import { ScoringMethodDisplay } from './ScoringMethodDisplay'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'
import { DeltaBasedTooltip } from './DeltaBasedTooltip'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ComplianceOverviewProps {
  metrics: DashboardMetrics
  cisControls: CISControl[]
  pciDssRequirements?: PCIDSSRequirement[]
  nistFunctions?: NISTCSFFunction[]
  currentSnapshot?: any
  loading?: boolean
  selectedFramework?: string
  previousMetrics?: DashboardMetrics | null
  previousCisControls?: CISControl[]
  previousPciDssRequirements?: PCIDSSRequirement[]
  previousNistFunctions?: NISTCSFFunction[]
  showComparison?: boolean
  expandedControls?: Set<string>
  setExpandedControls?: (controls: Set<string>) => void
  showGenerateReport?: boolean
  loadingBatch?: number
  nistLoadingBatch?: number
  nistPreviousLoadingBatch?: number
  isPreviousSnapshotView?: boolean  // Indicates this is the previous snapshot column (hide delta-based scores)
  currentCisControls?: CISControl[]  // Current snapshot's CIS controls for ghost bar in baseline view
  currentPciDssRequirements?: PCIDSSRequirement[]  // Current snapshot's PCI-DSS requirements for ghost bar in baseline view
  currentNistFunctions?: NISTCSFFunction[]  // Current snapshot's NIST functions for ghost bar in baseline view
  nis2Articles?: NIS2Article[]
  previousNIS2Articles?: NIS2Article[]
  nis2LoadingBatch?: number
  nis2PreviousLoadingBatch?: number
  currentNIS2Articles?: NIS2Article[]  // Current snapshot's NIS2 articles for ghost bar in baseline view
}

export function ComplianceOverview({
  metrics,
  cisControls,
  pciDssRequirements = [],
  nistFunctions = [],
  currentSnapshot,
  loading = false,
  selectedFramework = 'cis-v8',
  previousMetrics = null,
  previousCisControls = [],
  previousPciDssRequirements = [],
  previousNistFunctions = [],
  showComparison = false,
  expandedControls: externalExpandedControls,
  setExpandedControls: externalSetExpandedControls,
  showGenerateReport = true,
  loadingBatch = 0,
  nistLoadingBatch = 0,
  nistPreviousLoadingBatch = 0,
  isPreviousSnapshotView = false,
  currentCisControls = [],
  currentPciDssRequirements = [],
  currentNistFunctions = [],
  nis2Articles = [],
  previousNIS2Articles = [],
  nis2LoadingBatch = 0,
  nis2PreviousLoadingBatch = 0,
  currentNIS2Articles = []
}: ComplianceOverviewProps) {
  const router = useRouter()
  const ipFabricUrl = useIPFabricURL()  // Get actual IP Fabric instance URL
  const [internalExpandedControls, setInternalExpandedControls] = useState<Set<string>>(new Set())
  const { isColorBlindMode } = useColorBlindMode()

  // Use external state if provided, otherwise use internal state
  const expandedControls = externalExpandedControls ?? internalExpandedControls
  const setExpandedControls = externalSetExpandedControls ?? setInternalExpandedControls

  // Get framework config for labels
  const frameworkConfig = frameworkRegistry.getConfig(selectedFramework)
  const categoryLabel = frameworkConfig?.categoryLabel || 'Control'

  // Use controls/requirements based on selected framework
  const controls = selectedFramework === 'nis2'
    ? (nis2Articles || [])
    : selectedFramework === 'nist'
      ? (nistFunctions || [])
      : selectedFramework === 'pci-dss'
        ? (pciDssRequirements || [])
        : (cisControls || [])
  const previousControls = selectedFramework === 'nis2'
    ? (previousNIS2Articles || [])
    : selectedFramework === 'nist'
      ? (previousNistFunctions || [])
      : selectedFramework === 'pci-dss'
        ? (previousPciDssRequirements || [])
        : (previousCisControls || [])
  // Current snapshot controls for ghost bar display in baseline view
  const currentControls = selectedFramework === 'nis2'
    ? (currentNIS2Articles || [])
    : selectedFramework === 'nist'
      ? (currentNistFunctions || [])
      : selectedFramework === 'pci-dss'
        ? (currentPciDssRequirements || [])
        : (currentCisControls || [])
  const hasComparison = showComparison && previousMetrics && previousControls && previousControls.length > 0

  const toggleControl = (controlId: string) => {
    const newSet = new Set(expandedControls)
    if (newSet.has(controlId)) {
      newSet.delete(controlId)
    } else {
      newSet.add(controlId)
    }
    setExpandedControls(newSet)
  }

  // Helper function: Check if a control has delta-based details
  const hasDeltaBasedControls = (control: CISControl | PCIDSSRequirement): boolean => {
    return control.details?.some(d =>
      'requiresComparativeSnapshot' in d && (d as any).requiresComparativeSnapshot
    ) ?? false
  }

  const totalScore = controls.reduce((sum, control) => sum + control.score, 0)
  const maxScore = controls.reduce((sum, control) => sum + control.maxScore, 0)
  const percentage = metrics.complianceScore || 0

  // Show that this is based on all 11 controls (110 points total)
  const totalControls = controls.length

  const statusCounts = {
    pass: controls.filter(c => !c.loading && c.status === 'pass').length,
    warning: controls.filter(c => !c.loading && c.status === 'warning').length,
    fail: controls.filter(c => !c.loading && c.status === 'fail').length,
  }

  // Don't use early return - let progressive loading show through
  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
      <CardHeader>
        <div className="flex items-center justify-between mb-4 min-h-[80px]">
          <div className="flex-1">
            <CardTitle className="mb-2 dark:text-white/90">
              {selectedFramework === 'nist'
                ? 'NIST CSF Functions Overview'
                : selectedFramework === 'pci-dss'
                  ? 'PCI-DSS Requirements Overview'
                  : selectedFramework === 'nis2'
                    ? 'NIS2 Articles Overview'
                    : 'CIS Controls Overview'}
            </CardTitle>
            <CardDescription>
              {currentSnapshot && (
                <span className="text-xs text-gray-500 dark:text-white/60 block mt-1">
                  Snapshot: {currentSnapshot.displayName}
                </span>
              )}
            </CardDescription>
          </div>
          {showGenerateReport && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm mt-5"
              onClick={() => router.push(getNavigationPath('/dashboard/reports'))}
            >
              <Shield className="h-4 w-4" />
              Generate Report
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Batch Loading Progress Indicator */}
        {(() => {
          const currentLoadingBatch = selectedFramework === 'nist'
            ? nistLoadingBatch
            : selectedFramework === 'pci-dss'
              ? loadingBatch
              : loadingBatch

          return currentLoadingBatch > 0 && currentLoadingBatch < 5 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Loading controls batch {currentLoadingBatch} of 4...
                </span>
              </div>
              <Progress value={currentLoadingBatch * 25} className="h-2" />
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {currentLoadingBatch === 1 && 'Loading foundation controls (Inventory, Software, Data Protection)...'}
                {currentLoadingBatch === 2 && (
                  <>
                    <span className="text-green-600 dark:text-green-400">✓ Priority controls loaded</span>
                    <br />
                    <span>Loading configuration controls...</span>
                  </>
                )}
                {currentLoadingBatch === 3 && (
                  <>
                    <span className="text-green-600 dark:text-green-400">✓ Configuration controls loaded</span>
                    <br />
                    <span>Loading security controls...</span>
                  </>
                )}
                {currentLoadingBatch === 4 && (
                  <>
                    <span className="text-green-600 dark:text-green-400">✓ Security controls loaded</span>
                    <br />
                    <span>Finalizing compliance data...</span>
                  </>
                )}
              </p>
            </div>
          )
        })()}

        {/* Overall Score / Baseline Data */}
        <div className="flex items-center justify-between min-h-[80px]">
          {isPreviousSnapshotView ? (
            /* Previous Snapshot View: Show baseline data summary instead of score */
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  <p className="text-sm font-medium text-gray-600 dark:text-white/60">
                    Baseline Data
                  </p>
                  <InfoTooltip
                    title="Baseline Reference"
                    content={
                      <div className="space-y-2">
                        <p>This snapshot provides baseline metrics for delta calculations.</p>
                        <p className="text-xs text-gray-500">Scores are not displayed because this snapshot serves as a reference point, not an independent compliance assessment.</p>
                      </div>
                    }
                  />
                </div>
                <span className="text-xl font-bold dark:text-white/90">
                  {controls.length} {selectedFramework === 'nist' ? 'functions' : selectedFramework === 'pci-dss' ? 'requirements' : selectedFramework === 'nis2' ? 'articles' : 'controls'} • {controls.reduce((sum, c) => sum + (c.details?.length || 0), 0)} metrics
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className={cn("h-4 w-4", isColorBlindMode ? "text-accessible-success" : "text-green-500 dark:text-green-400")} />
                  <span className="text-sm font-medium dark:text-white/90">{statusCounts.pass + statusCounts.warning} available</span>
                </div>
              </div>
            </>
          ) : (
            /* Current Snapshot View: Show normal score display */
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-white/60">
                    {hasComparison
                      ? `${selectedFramework === 'nist' ? 'NIST CSF' : selectedFramework === 'pci-dss' ? 'PCI-DSS' : selectedFramework === 'nis2' ? 'NIS2' : 'CIS'} Analysis Score (vs. Baseline) (${totalScore.toFixed(1)}/${maxScore} points)`
                      : `${selectedFramework === 'nist' ? 'NIST CSF' : selectedFramework === 'pci-dss' ? 'PCI-DSS' : selectedFramework === 'nis2' ? 'NIS2' : 'CIS'} Analysis Score (${totalScore.toFixed(1)}/${maxScore} points)`
                    }
                  </p>
                  <InfoTooltip
                    title="How Scoring Works"
                    content={
                      <div className="space-y-2">
                        <p>Your analysis score is calculated from {totalControls} applicable {selectedFramework === 'nist' ? 'NIST CSF Functions' : selectedFramework === 'pci-dss' ? 'PCI-DSS Requirements' : selectedFramework === 'nis2' ? 'NIS2 Articles' : 'CIS Controls'}, each worth up to {selectedFramework === 'nist' ? '5' : selectedFramework === 'pci-dss' ? 'varying' : selectedFramework === 'nis2' ? 'varying' : '10'} points{hasComparison ? ', with penalties for regressions since the baseline snapshot' : ''}.</p>
                        <p className="font-medium mt-2">Grading Scale:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• <strong>A</strong> (90-100%) - Excellent</li>
                          <li>• <strong>B</strong> (80-89%) - Good</li>
                          <li>• <strong>C</strong> (70-79%) - Acceptable, needs improvement</li>
                          <li>• <strong>D</strong> (&lt;70%) - Critical gaps requiring attention</li>
                        </ul>
                      </div>
                    }
                  />
                </div>
                <span className="text-3xl font-bold dark:text-white/90">{formatPercentage(percentage)}</span>
              </div>
              <div className="flex gap-2 items-center">
                {(() => {
                  const currentLoadingBatch = selectedFramework === 'nist'
                    ? nistLoadingBatch
                    : selectedFramework === 'pci-dss'
                      ? loadingBatch
                      : loadingBatch

                  return (
                    <>
                      <div className="flex items-center gap-1">
                        {currentLoadingBatch > 0 && currentLoadingBatch < 5 ? (
                          <Loader2 className="h-4 w-4 animate-spin text-green-500 dark:text-green-400" />
                        ) : (
                          <>
                            <CheckCircle2 className={cn("h-4 w-4", isColorBlindMode ? "text-accessible-success" : "text-green-500 dark:text-green-400")} />
                            <span className="text-sm font-medium dark:text-white/90">{statusCounts.pass}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {currentLoadingBatch > 0 && currentLoadingBatch < 5 ? (
                          <Loader2 className="h-4 w-4 animate-spin text-yellow-500 dark:text-yellow-400" />
                        ) : (
                          <>
                            <AlertCircle className={cn("h-4 w-4", isColorBlindMode ? "text-accessible-warning" : "text-yellow-500 dark:text-yellow-400")} />
                            <span className="text-sm font-medium dark:text-white/90">{statusCounts.warning}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {currentLoadingBatch > 0 && currentLoadingBatch < 5 ? (
                          <Loader2 className="h-4 w-4 animate-spin text-red-500 dark:text-red-400" />
                        ) : (
                          <>
                            <XCircle className={cn("h-4 w-4", isColorBlindMode ? "text-accessible-error" : "text-red-500 dark:text-red-400")} />
                            <span className="text-sm font-medium dark:text-white/90">{statusCounts.fail}</span>
                          </>
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </div>

        {/* Controls List - All controls with expandable details */}
        <div className="overflow-y-auto px-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {controls.map((control) => {
            const percentage = (control.score / control.maxScore) * 100
            const isExpanded = expandedControls.has(control.id)

            // Find matching previous control for comparison (only used in latest view with comparison)
            const previousControl = hasComparison && !isPreviousSnapshotView
              ? previousControls?.find(c => c.id === control.id)
              : null

            // Calculate previous percentage for comparison bar (only used in latest view)
            const previousPercentage = previousControl
              ? (previousControl.score / previousControl.maxScore) * 100
              : percentage

            // Delta between current and baseline (positive = improvement, negative = regression)
            // Only calculated for latest view with comparison data
            const delta = previousControl ? percentage - previousPercentage : 0

            // Get full control description from configuration (framework-aware)
            const controlDescription = selectedFramework === 'nis2'
              ? getNIS2Description(control.id)
              : selectedFramework === 'nist'
                ? getNISTCSFDescription(control.id)
                : selectedFramework === 'pci-dss'
                  ? getRequirementDescription(control.id)
                  : getControlDescription(control.id)

            // Never show red for any control - cap at orange/yellow
            const displayStatus = control.status === 'fail' ? 'warning' : control.status

            // Show loading skeleton for controls that are still loading
            if (control.loading) {
              return (
                <div key={control.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                  <div className="p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                            {control.id}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {control.name}
                          </span>
                        </div>
                        <Skeleton className="h-2 w-full bg-gray-200 dark:bg-gray-700" />
                      </div>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Loading...</span>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={control.id} id={`control-${control.id}`} className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/50">
                <div
                  className={cn(
                    "cursor-pointer p-4 transition-all duration-200",
                    "hover:bg-gradient-to-r hover:from-gray-50 hover:to-white dark:hover:from-gray-800 dark:hover:to-gray-900",
                    isExpanded ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-gray-200 dark:border-gray-700" : "hover:bg-gray-50 dark:hover:bg-gray-800",
                    displayStatus === 'pass' && isExpanded && "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30",
                    displayStatus === 'warning' && isExpanded && "from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30"
                  )}
                  onClick={() => toggleControl(control.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "p-1 rounded-full transition-all duration-200",
                        isExpanded ? "bg-white dark:bg-gray-800 shadow-sm" : "bg-gray-100 dark:bg-gray-800"
                      )}>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {control.id}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-white/60 truncate">
                            {control.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isPreviousSnapshotView && previousControl ? (
                            /* Latest view WITH comparison - show overlapping bars */
                            <ComparisonProgress
                              baselineValue={previousPercentage}
                              currentValue={percentage}
                              className="h-2 flex-1"
                            />
                          ) : isPreviousSnapshotView ? (
                            /* Previous/baseline view - simple muted bar showing baseline's own score */
                            <Progress
                              value={percentage}
                              className="h-2 flex-1 [&>div]:bg-gray-400 dark:[&>div]:bg-gray-500"
                            />
                          ) : (
                            /* Latest view WITHOUT comparison - normal colored bar */
                            <Progress
                              value={percentage}
                              className={cn(
                                'h-2 flex-1',
                                displayStatus === 'pass' && (isColorBlindMode
                                  ? '[&>div]:bg-accessible-success'
                                  : '[&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-green-600 dark:[&>div]:from-green-400 dark:[&>div]:to-green-500'),
                                displayStatus === 'warning' && (isColorBlindMode
                                  ? '[&>div]:bg-accessible-warning'
                                  : '[&>div]:bg-gradient-to-r [&>div]:from-yellow-500 [&>div]:to-yellow-600 dark:[&>div]:from-yellow-400 dark:[&>div]:to-yellow-500')
                              )}
                            />
                          )}
                          {/* Percentage label - with delta for latest view with comparison */}
                          {!isPreviousSnapshotView && previousControl ? (
                            <span className="w-[70px] text-right flex-shrink-0 text-xs">
                              <span className="text-gray-500 dark:text-white/60">
                                {percentage.toFixed(0)}%
                              </span>
                              {delta !== 0 && (
                                <span className={cn(
                                  "ml-0.5",
                                  delta > 0 && "text-green-600 dark:text-green-400",
                                  delta < 0 && "text-orange-600 dark:text-orange-400"
                                )}>
                                  {delta > 0 ? `↑${delta.toFixed(0)}` : `↓${Math.abs(delta).toFixed(0)}`}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className={cn(
                              "w-[40px] text-right flex-shrink-0 text-xs",
                              isPreviousSnapshotView
                                ? "text-gray-400 dark:text-gray-500"
                                : "text-gray-500 dark:text-white/60"
                            )}>
                              {percentage.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-[140px] flex-shrink-0 justify-end">
                      <div className={cn(
                        "p-1.5 rounded-full",
                        displayStatus === 'pass' && (isColorBlindMode ? "bg-accessible-success/20" : "bg-green-100 dark:bg-green-900/30"),
                        displayStatus === 'warning' && (isColorBlindMode ? "bg-accessible-warning/20" : "bg-yellow-100 dark:bg-yellow-900/30")
                      )}>
                        {displayStatus === 'pass' && (
                          <CheckCircle2 className={cn("h-4 w-4", isColorBlindMode ? "text-accessible-success" : "text-green-600 dark:text-green-400")} />
                        )}
                        {displayStatus === 'warning' && (
                          <AlertCircle className={cn("h-4 w-4", isColorBlindMode ? "text-accessible-warning" : "text-yellow-600 dark:text-yellow-400")} />
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        {/* Previous Snapshot View: Show metric count instead of score for ALL controls */}
                        {isPreviousSnapshotView ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-300 cursor-help">
                                  {control.details?.length || 0} metrics
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-xs">
                                  <p className="font-medium mb-1">Baseline Data</p>
                                  <p className="text-xs text-gray-400">This snapshot provides metric values for comparison. Scores are calculated on the current snapshot using these values as a baseline.</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <>
                            {/* Current Snapshot: Show score (with info icon for delta-based controls without comparison) */}
                            {!hasComparison && hasDeltaBasedControls(control) ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 cursor-help">
                                      <div className="text-sm font-bold text-gray-800 dark:text-white/90">
                                        {control.score.toFixed(1)}
                                        <span className="text-xs text-gray-500 dark:text-white/60 font-normal">/{control.maxScore}</span>
                                      </div>
                                      <Info className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <DeltaBasedTooltip />
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              /* Normal score display */
                              <div className="text-sm font-bold text-gray-800 dark:text-white/90">
                                {control.score.toFixed(1)}
                                <span className="text-xs text-gray-500 dark:text-white/60 font-normal">/{control.maxScore}</span>
                              </div>
                            )}
                            {/* NOTE: Score delta indicator removed - we only show metric value deltas in detail expansion */}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section with smooth animation */}
                <div className={cn(
                  "transition-all duration-300 ease-in-out",
                  isExpanded ? "opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                )}>
                  <div className="p-4 pt-4 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-900/50">
                    {/* Control Description from PDF */}
                    {controlDescription && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-900/30 p-4 mb-4 shadow-sm">
                        <div className="flex items-start gap-3 mb-3">
                          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white/90 mb-2">Control Description</h4>
                            <p className="text-sm text-gray-700 dark:text-white/60 leading-relaxed">
                              {controlDescription.description}
                            </p>
                            {/* CIS-specific Implementation Group badge */}
                            {selectedFramework === 'cis-v8' && 'implementationGroup' in controlDescription && controlDescription.implementationGroup && (
                              <div className="mt-3 flex items-center gap-2">
                                <Badge className="bg-blue-600 dark:bg-blue-500">{controlDescription.implementationGroup}</Badge>
                                <InfoTooltip
                                  title="Implementation Group"
                                  content={
                                    controlDescription.implementationGroup === 'IG1' ? (
                                      <div className="space-y-1">
                                        <p><strong>IG1: Essential Cyber Hygiene</strong></p>
                                        <p className="text-xs">Considered the &quot;minimum standard&quot; of information security and should be implementable with minimal expertise and commercial off-the-shelf products.</p>
                                      </div>
                                    ) : controlDescription.implementationGroup === 'IG2' ? (
                                      <div className="space-y-1">
                                        <p><strong>IG2: Enhanced Security for Increased Risk</strong></p>
                                        <p className="text-xs">For organizations that manage more complex IT environments and usually have staff dedicated to security and IT.</p>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <p><strong>IG3: Advanced Security for High-Risk Organizations</strong></p>
                                        <p className="text-xs">Requires advanced security expertise and capabilities to defend against sophisticated, targeted attacks (including zero-day threats).</p>
                                      </div>
                                    )
                                  }
                                  iconClassName="h-3.5 w-3.5"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Safeguard/Sub-Requirement Details */}
                    {control.details && (
                      <div className="space-y-4">
                        {control.details.map((detail, index) => {
                          // Get safeguard/sub-requirement/subcategory description from configuration (framework-aware)
                          const safeguardDesc = controlDescription && (selectedFramework === 'nist' || selectedFramework === 'nis2') && 'subcategories' in controlDescription
                            ? controlDescription.subcategories.find((s: any) => s.id === detail.id)
                            : controlDescription && selectedFramework === 'cis-v8' && 'safeguards' in controlDescription
                              ? controlDescription.safeguards.find((s: any) => s.id === detail.id)
                              : controlDescription && selectedFramework === 'pci-dss' && 'subRequirements' in controlDescription
                                ? (controlDescription as any).subRequirements?.find((s: any) => s.id === detail.id)
                                : undefined

                          return (
                          <div
                            key={detail.id}
                            id={`safeguard-${detail.id}`}
                            className={cn(
                              "bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 shadow-sm",
                              "hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow duration-200"
                            )}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                    <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                      {detail.id}
                                    </span>
                                  </div>
                                  <span className="text-sm text-gray-600 dark:text-white/60">
                                    {detail.name}
                                  </span>
                                </div>
                                <div className="flex items-start gap-2 mb-2">
                                  <Info className="h-4 w-4 text-gray-400 dark:text-white/60 mt-0.5 flex-shrink-0" />
                                  <div className="text-sm text-gray-600 dark:text-white/60">
                                    <span className="font-medium text-gray-700 dark:text-white/60">Context:</span> {detail.ipFabricContext}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                {isPreviousSnapshotView ? (
                                  /* Previous Snapshot View: Show metric value for ALL details (no score points) */
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-lg px-3 py-2 border border-blue-200/50 dark:border-blue-700/50 cursor-help min-h-[72px] flex flex-col justify-center">
                                          {/* Current metric value */}
                                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                                            {detail.currentValue ?? 'N/A'}
                                          </div>

                                          {/* Metric label */}
                                          <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-0.5">
                                            Baseline value
                                          </div>

                                          {/* Badge for delta-based metrics */}
                                          {(detail as any).requiresComparativeSnapshot && (
                                            <div className="flex items-center justify-center gap-1 mt-1.5">
                                              <Info className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                              <span className="text-[9px] text-blue-600 dark:text-blue-400">
                                                Delta-based
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="max-w-xs">
                                          <p className="font-medium mb-1">Baseline Value</p>
                                          <p className="text-xs text-gray-400">This value serves as a reference point for delta calculations in the current snapshot.</p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : !hasComparison && (detail as any).requiresComparativeSnapshot ? (
                                  /* Current Snapshot without comparison + Delta-based: Show score with warning */
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800/30 cursor-help min-h-[72px] flex flex-col justify-center">
                                          <div className="flex items-center justify-center gap-1">
                                            <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                                              {detail.calculatedPoints.toFixed(1)}
                                            </div>
                                            <Info className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                          </div>
                                          <div className="text-xs text-blue-600 dark:text-blue-400 text-center">
                                            /{detail.maxPoints} pts
                                          </div>
                                          <div className="text-[9px] text-blue-500 dark:text-blue-400 mt-1 text-center">
                                            Requires comparison
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <DeltaBasedTooltip />
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  /* Current Snapshot: Normal score display */
                                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800/30 min-h-[72px] flex flex-col justify-center">
                                    <div className="text-lg font-bold text-blue-800 dark:text-blue-300 text-center">
                                      {detail.calculatedPoints.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-blue-600 dark:text-blue-400 text-center">
                                      /{detail.maxPoints} pts
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Current Value */}
                            {detail.currentValue !== undefined && (
                              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-1">
                                  <Activity className={cn("h-4 w-4", isColorBlindMode ? "text-accessible-success" : "text-green-500 dark:text-green-400")} />
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Value</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                                    {detail.currentValue}
                                  </div>
                                  {/* Show delta if previous value exists */}
                                  {detail.previousValue !== undefined && detail.delta !== undefined && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <span className="text-gray-500 dark:text-gray-400">
                                        (was {detail.previousValue})
                                      </span>

                                      {/* Show direction badge for ALL controls with delta values */}
                                      {detail.deltaDirection && (
                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                          detail.deltaDirection === 'positive' && (isColorBlindMode
                                            ? "bg-accessible-success/20 text-accessible-success"
                                            : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"),
                                          detail.deltaDirection === 'negative' && (isColorBlindMode
                                            ? "bg-accessible-error/20 text-accessible-error"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"),
                                          detail.deltaDirection === 'neutral' && "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                        )}>
                                          {detail.deltaDirection === 'positive' ? '↗ Better' :
                                           detail.deltaDirection === 'negative' ? '↘ Worse' :
                                           '→ Stable'}
                                        </span>
                                      )}

                                      {/* Metric change value - consistent for ALL controls */}
                                      <span className={cn(
                                        "font-medium",
                                        detail.deltaDirection === 'positive' && (isColorBlindMode ? "text-accessible-success" : "text-green-600 dark:text-green-400"),
                                        detail.deltaDirection === 'negative' && (isColorBlindMode ? "text-accessible-error" : "text-orange-600 dark:text-orange-400"),
                                        detail.deltaDirection === 'neutral' && "text-gray-500 dark:text-gray-400"
                                      )}>
                                        {typeof detail.delta === 'number' && detail.delta > 0 ? '+' : ''}{detail.delta}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Core safeguard data unavailability warning (NOT optional features) */}
                            {detail.unavailabilityReason &&
                             detail.calculatedPoints === 0 &&
                             detail.id !== '3.8-extended' &&
                             typeof detail.currentValue === 'string' &&
                             detail.currentValue.includes('Data Unavailable') && (
                              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-3 border border-amber-200 dark:border-amber-800/50">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-900 dark:text-amber-400">Data Unavailable</p>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{detail.unavailabilityReason}</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                      This safeguard cannot be scored because the required API endpoint is not accessible.
                                      No compliance points awarded for this safeguard.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Safeguard Description from PDF */}
                            {safeguardDesc && (
                              <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-lg p-3 mb-3 border border-blue-100 dark:border-blue-900/30">
                                <div className="flex items-start gap-2 mb-2">
                                  <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wide">Safeguard Description</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed ml-6">
                                  {safeguardDesc.description}
                                </p>
                              </div>
                            )}

                            {/* IP Fabric Info - Detailed Explanation */}
                            {safeguardDesc && (
                              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start gap-2 mb-2">
                                  <Info className="h-4 w-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wide">IP Fabric Info</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed ml-6">
                                  {safeguardDesc.ipFabricInfo}
                                </p>
                              </div>
                            )}

                            {/* Data Source - supports new dataSources array or legacy apiEndpoint/guiPath */}
                            {safeguardDesc && (safeguardDesc.dataSources?.length || safeguardDesc.apiEndpoint || safeguardDesc.guiPath) && (
                              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 mb-3 border border-purple-100 dark:border-purple-900/30">
                                <div className="flex items-start gap-2 mb-2">
                                  <Database className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs font-semibold text-purple-900 dark:text-purple-300 uppercase tracking-wide">
                                    Data Source{safeguardDesc.dataSources && safeguardDesc.dataSources.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="ml-6 space-y-1.5">
                                  {/* New dataSources array - preferred */}
                                  {safeguardDesc.dataSources?.map((ds: { name: string; path: string }, idx: number) => (
                                    <div key={idx}>
                                      {ipFabricUrl && currentSnapshot ? (
                                        <a
                                          href={buildIPFabricUrl(ipFabricUrl, ds.path, currentSnapshot.id)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-900/30 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 hover:text-purple-900 dark:hover:text-purple-200 transition-colors"
                                        >
                                          <span>{ds.name}</span>
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : (
                                        <div className="text-xs text-purple-700 dark:text-purple-300 px-2 py-1">
                                          {ds.name}: {ds.path}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {/* Legacy fallback - apiEndpoint/guiPath */}
                                  {!safeguardDesc.dataSources?.length && (
                                    <>
                                      {safeguardDesc.apiEndpoint && (
                                        <div className="text-xs font-mono text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-900/30 px-2 py-1 rounded">
                                          API: {safeguardDesc.apiEndpoint}
                                        </div>
                                      )}
                                      {safeguardDesc.guiPath && (
                                        <>
                                          {ipFabricUrl && currentSnapshot ? (
                                            <a
                                              href={buildIPFabricGuiUrl(ipFabricUrl, safeguardDesc.guiPath, currentSnapshot.id)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-900/30 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 hover:text-purple-900 dark:hover:text-purple-200 transition-colors"
                                            >
                                              <span>GUI: {safeguardDesc.guiPath}</span>
                                              <ExternalLink className="h-3 w-3" />
                                            </a>
                                          ) : (
                                            <div className="text-xs text-purple-700 dark:text-purple-300">
                                              GUI: {safeguardDesc.guiPath}
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Target & Interpretation */}
                            {safeguardDesc && safeguardDesc.target && (
                              <div className={cn(
                                "rounded-lg p-3 mb-3 border",
                                isColorBlindMode ? "bg-accessible-success/10 border-accessible-success/30" : "bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800"
                              )}>
                                <div className="flex items-start gap-2 mb-2">
                                  <Target className={cn("h-4 w-4 mt-0.5 flex-shrink-0", isColorBlindMode ? "text-accessible-success" : "text-green-600 dark:text-green-400")} />
                                  <span className={cn("text-xs font-semibold uppercase tracking-wide", isColorBlindMode ? "text-accessible-success" : "text-green-900 dark:text-green-300")}>Target & Interpretation</span>
                                </div>
                                <div className="ml-6 space-y-1">
                                  <div className={cn("text-sm font-medium", isColorBlindMode ? "text-accessible-success" : "text-green-800 dark:text-green-300")}>
                                    Target: {safeguardDesc.target}
                                  </div>
                                  {safeguardDesc.targetInterpretation && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                      {safeguardDesc.targetInterpretation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Scoring Rationale from PDF */}
                            {safeguardDesc && safeguardDesc.scoringRationale && (
                              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-3 border border-amber-100 dark:border-amber-800/50">
                                <div className="flex items-start gap-2 mb-2">
                                  <FileCode className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-400 uppercase tracking-wide">Scoring Rationale</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-white/60 leading-relaxed ml-6 italic">
                                  {safeguardDesc.scoringRationale}
                                </p>
                              </div>
                            )}

                            {/* Remediation Guidance - Only show if there are recommendations for the current score threshold */}
                            {(() => {
                              // Determine which recommendations to show based on score
                              const getRecommendationsToShow = (): string[] => {
                                if (!safeguardDesc?.remediation) return [];
                                if (detail.calculatedPoints < detail.maxPoints * 0.5) {
                                  return safeguardDesc.remediation.whenFailing || [];
                                } else if (detail.calculatedPoints < detail.maxPoints * 0.8) {
                                  return safeguardDesc.remediation.whenWarning || [];
                                } else {
                                  return safeguardDesc.remediation.bestPractices || [];
                                }
                              };
                              const recommendationsToShow = getRecommendationsToShow();

                              // Only render if there are recommendations
                              if (recommendationsToShow.length === 0) return null;

                              return (
                                <div className={cn(
                                  "rounded-lg p-3 mb-3 border",
                                  detail.calculatedPoints < detail.maxPoints * 0.5
                                    ? (isColorBlindMode ? "bg-accessible-error/10 border-accessible-error/30" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50")
                                    : detail.calculatedPoints < detail.maxPoints * 0.8
                                    ? (isColorBlindMode ? "bg-accessible-warning/10 border-accessible-warning/30" : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50")
                                    : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50"
                                )}>
                                  <div className="flex items-start gap-2 mb-2">
                                    <Lightbulb className={cn(
                                      "h-4 w-4 mt-0.5 flex-shrink-0",
                                      detail.calculatedPoints < detail.maxPoints * 0.5
                                        ? (isColorBlindMode ? "text-accessible-error" : "text-red-600 dark:text-red-400")
                                        : detail.calculatedPoints < detail.maxPoints * 0.8
                                        ? (isColorBlindMode ? "text-accessible-warning" : "text-yellow-600 dark:text-yellow-400")
                                        : "text-blue-600 dark:text-blue-400"
                                    )} />
                                    <span className={cn(
                                      "text-xs font-semibold uppercase tracking-wide",
                                      detail.calculatedPoints < detail.maxPoints * 0.5
                                        ? (isColorBlindMode ? "text-accessible-error" : "text-red-900 dark:text-red-300")
                                        : detail.calculatedPoints < detail.maxPoints * 0.8
                                        ? (isColorBlindMode ? "text-accessible-warning" : "text-yellow-900 dark:text-yellow-300")
                                        : "text-blue-900 dark:text-blue-300"
                                    )}>
                                      {detail.calculatedPoints < detail.maxPoints * 0.5
                                        ? "Recommended Actions (Critical)"
                                        : detail.calculatedPoints < detail.maxPoints * 0.8
                                        ? "Recommended Actions (Warning)"
                                        : "Best Practices"}
                                    </span>
                                  </div>
                                  <div className="ml-6">
                                    <ul className="space-y-1.5">
                                      {recommendationsToShow.map((action: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-white/60">
                                          <CheckSquare className={cn(
                                            "h-3.5 w-3.5 mt-0.5 flex-shrink-0",
                                            detail.calculatedPoints < detail.maxPoints * 0.5
                                              ? (isColorBlindMode ? "text-accessible-error" : "text-red-600 dark:text-red-400")
                                              : detail.calculatedPoints < detail.maxPoints * 0.8
                                              ? (isColorBlindMode ? "text-accessible-warning" : "text-yellow-600 dark:text-yellow-400")
                                              : "text-blue-600 dark:text-blue-400"
                                          )} />
                                          <span>{action}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Scoring Rule (Brief) */}
                            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 mb-3 border border-blue-200 dark:border-blue-900/30">
                              <ScoringMethodDisplay scoringRule={detail.scoringRule} />
                            </div>

                            {/* Show explanation when feature is unavailable (3.8 Extended) */}
                            {detail.unavailabilityReason && detail.calculatedPoints === 0 && (
                              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 mb-3 border border-blue-200 dark:border-blue-900/30">
                                <div className="flex items-start gap-2">
                                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Optional Feature Not Available</p>
                                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">{detail.unavailabilityReason}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 leading-relaxed">
                                      This is an optional advanced feature. Many environments don&apos;t use path
                                      lookup verification due to dedicated management networks, DNS caching, or
                                      ICMP filtering. This is normal and does not indicate a problem. You can enable
                                      this by configuring path checks in Technology → Routing → Path Verifications.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Show network viewer link when 3.8 Extended is available and IP Fabric URL is loaded */}
                            {detail.id === '3.8-extended' && detail.calculatedPoints > 0 && currentSnapshot && ipFabricUrl && (
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800/30 mb-3">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
                                    <Network className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                                      Network Data Flow Visualization
                                    </p>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                                      View interactive network topology and data flows for this snapshot in IP Fabric
                                    </p>
                                    <a
                                      href={`${ipFabricUrl}/diagrams/topology-tree?selectSnapshot=${currentSnapshot.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      Open Network Viewer
                                    </a>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                                      Opens in IP Fabric with full interactive diagram capabilities
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Show loading state while IP Fabric URL is being fetched */}
                            {detail.id === '3.8-extended' && detail.calculatedPoints > 0 && currentSnapshot && !ipFabricUrl && (
                              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 mb-3 border border-blue-200 dark:border-blue-900/30 text-center">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                                <p className="text-sm text-blue-700 dark:text-blue-400">Loading network viewer link...</p>
                              </div>
                            )}

                            {/* Breakdown */}
                            {detail.breakdown && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Scoring Breakdown
                                </div>
                                <div className="space-y-2">
                                  {detail.breakdown.map((item, idx) => {
                                    // Determine if we have comparison data
                                    const hasComparison = item.previousValue !== undefined && item.delta !== undefined
                                    const hasDelta = hasComparison && item.delta !== 0 && item.delta !== '0'

                                    // Determine delta direction for color coding
                                    let deltaDirection: 'positive' | 'negative' | 'neutral' = 'neutral'
                                    if (hasDelta && item.delta !== null) {
                                      const numericDelta = typeof item.delta === 'string'
                                        ? parseFloat(item.delta.replace(/[^0-9.-]/g, ''))
                                        : (typeof item.delta === 'number' ? item.delta : NaN)

                                      // Reverse polarity metrics: decreasing is good
                                      const isReversePolarity = item.metric.toLowerCase().includes('error') ||
                                                                item.metric.toLowerCase().includes('telnet') ||
                                                                item.metric.toLowerCase().includes('any/any') ||
                                                                item.metric.toLowerCase().includes('errdisabled')

                                      if (!isNaN(numericDelta)) {
                                        if (numericDelta > 0) {
                                          deltaDirection = isReversePolarity ? 'negative' : 'positive'
                                        } else if (numericDelta < 0) {
                                          deltaDirection = isReversePolarity ? 'positive' : 'negative'
                                        }
                                      }
                                    }

                                    return (
                                      <div key={idx} className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border",
                                        "bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800",
                                        item.points > 0
                                          ? (isColorBlindMode ? "border-accessible-success/30 bg-accessible-success/5" : "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/20")
                                          : "border-gray-200 dark:border-gray-700"
                                      )}>
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <div className={cn(
                                            "w-2 h-2 rounded-full flex-shrink-0",
                                            item.points > 0
                                              ? (isColorBlindMode ? "bg-accessible-success" : "bg-green-500")
                                              : "bg-gray-400"
                                          )} />
                                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                              <span className="font-medium">{item.metric}:</span> {item.value}
                                            </span>

                                            {/* Comparison badges - only show if delta exists */}
                                            {hasDelta && (
                                              <div className="flex items-center gap-1.5">
                                                {/* Previous value badge */}
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                  was {item.previousValue}
                                                </span>

                                                {/* Delta badge with color coding */}
                                                <span className={cn(
                                                  "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border",
                                                  deltaDirection === 'positive' && (isColorBlindMode
                                                    ? "bg-accessible-success/20 text-accessible-success border-accessible-success/30"
                                                    : "bg-green-100 text-green-700 border-green-200"),
                                                  deltaDirection === 'negative' && (isColorBlindMode
                                                    ? "bg-accessible-error/20 text-accessible-error border-accessible-error/30"
                                                    : "bg-orange-100 text-orange-700 border-orange-200"),
                                                  deltaDirection === 'neutral' && "bg-gray-100 text-gray-600 border-gray-200"
                                                )}>
                                                  {item.delta}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                          <div className={cn(
                                            "text-sm font-bold",
                                            item.points > 0
                                              ? (isColorBlindMode ? "text-accessible-success" : "text-green-700")
                                              : "text-gray-500"
                                          )}>
                                            {item.points} pts
                                          </div>
                                          <div className="text-sm text-gray-700 dark:text-gray-300 max-w-xs">
                                            {item.rule}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}