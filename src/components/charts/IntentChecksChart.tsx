'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { IntentCheckResult, IntentCheckCategory, IntentCheckIssue } from '@/lib/intent-checks-calculator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react'
import type { IntentCheckReport, Snapshot } from '@/types/ipfabric-api'
import { useIPFabricURL } from '@/hooks/useIPFabricURL'

interface ChartData {
  donutData: IntentCheckResult[]
  categories: IntentCheckCategory[]
  issues: IntentCheckIssue[]
}

interface ReportIssue extends Partial<IntentCheckIssue> {
  name?: string;
  severity: 'failed' | 'warning';
  criticalCount?: number;
  failedCount?: number;
  warningCount?: number;
  passedCount?: number;
  totalCount?: number;
  category: string;
  description?: string;
  webEndpoint?: string;
  checkDescriptions?: Record<string, string>;
}

interface IntentCheckDetails {
  summary: IntentCheckResult[];
  categories: IntentCheckCategory[];
  issues: IntentCheckIssue[];
  reports?: IntentCheckReport[];
}

interface IntentChecksChartProps {
  intentCheckDetails: IntentCheckDetails | null
  currentSnapshot?: Snapshot | null
  loading?: boolean
  loadingBatch?: number
  onDeviceSelect?: (deviceName: string) => void
  defaultTab?: 'overview' | 'issues'
  externalActiveTab?: string
  externalSetActiveTab?: (tab: string) => void
  externalExpandedIssues?: Set<string>
  externalSetExpandedIssues?: (issues: Set<string>) => void
  scrollContainerRef?: React.RefObject<HTMLDivElement>
  externalSeverityFilter?: 'all' | 'failed' | 'warning'
  externalSetSeverityFilter?: (filter: 'all' | 'failed' | 'warning') => void
  externalCategoryFilter?: string
  externalSetCategoryFilter?: (filter: string) => void
}

// Enhanced with better visuals and dashboard colors
export function IntentChecksChart({
  intentCheckDetails,
  currentSnapshot,
  loading = false,
  loadingBatch = 5,
  onDeviceSelect,
  defaultTab = 'overview',
  externalActiveTab,
  externalSetActiveTab,
  externalExpandedIssues,
  externalSetExpandedIssues,
  scrollContainerRef,
  externalSeverityFilter,
  externalSetSeverityFilter,
  externalCategoryFilter,
  externalSetCategoryFilter
}: IntentChecksChartProps) {
  const [internalSeverityFilter, setInternalSeverityFilter] = useState<'all' | 'failed' | 'warning'>('all')
  const [internalCategoryFilter, setInternalCategoryFilter] = useState<string>('all')
  const [internalExpandedIssues, setInternalExpandedIssues] = useState<Set<string>>(new Set())
  const [internalActiveTab, setInternalActiveTab] = useState<string>(defaultTab)

  // Use external state if provided, otherwise use internal state
  const activeTab = externalActiveTab ?? internalActiveTab
  const setActiveTab = externalSetActiveTab ?? setInternalActiveTab
  const expandedIssues = externalExpandedIssues ?? internalExpandedIssues
  const setExpandedIssues = externalSetExpandedIssues ?? setInternalExpandedIssues
  const severityFilter = externalSeverityFilter ?? internalSeverityFilter
  const setSeverityFilter = externalSetSeverityFilter ?? setInternalSeverityFilter
  const categoryFilter = externalCategoryFilter ?? internalCategoryFilter
  const setCategoryFilter = externalSetCategoryFilter ?? setInternalCategoryFilter

  // Get IP Fabric URL from session (no hardcoded URLs)
  const ipFabricUrl = useIPFabricURL()

  // Use data from the shared hook
  const data: {
    donutData: IntentCheckResult[];
    categories: IntentCheckCategory[];
    issues: IntentCheckIssue[];
    reports?: IntentCheckReport[];
  } | null = intentCheckDetails ? {
    donutData: intentCheckDetails.summary,
    categories: intentCheckDetails.categories,
    issues: intentCheckDetails.issues,
    reports: intentCheckDetails.reports
  } : null

  // Extract issues from reports if available (real IP Fabric reports)
  const reportIssues = data?.reports ? data.reports
    .filter((r: IntentCheckReport) => {
      if (!r.result || !r.result.checks) return false
      const critical = r.result.checks['30'] || 0  // Code 30 = Critical (most severe)
      const failed = r.result.checks['20'] || 0    // Code 20 = Failed
      const warnings = r.result.checks['10'] || 0  // Code 10 = Warning
      return critical > 0 || failed > 0 || warnings > 0
    })
    .map((r: IntentCheckReport) => {
      const checks = r.result.checks
      const critical = checks['30'] || 0  // Critical failures
      const failed = checks['20'] || 0    // Standard failures
      const warnings = checks['10'] || 0  // Warnings
      const passed = checks['0'] || 0

      // Show critical and failed separately to match IP Fabric UI
      const totalFailures = critical + failed
      const hasCritical = critical > 0

      return {
        name: r.name,
        severity: totalFailures > 0 ? ('failed' as const) : ('warning' as const),
        criticalCount: critical,      // Code 30 (most severe, shown prominently in IP Fabric)
        failedCount: failed,          // Code 20 (failed but less severe)
        warningCount: warnings,       // Code 10
        passedCount: passed,          // Code 0
        totalCount: r.result.count || 0,
        category: r.groups?.[0]?.name || 'Other',
        description: r.descriptions?.general || '',
        webEndpoint: r.webEndpoint,
        checkDescriptions: r.descriptions?.checks || {}  // Include descriptions for each status code
      }
    })
    .sort((a: ReportIssue, b: ReportIssue) => {
      // Sort by severity (failed first), then by count
      if (a.severity === 'failed' && b.severity === 'warning') return -1
      if (a.severity === 'warning' && b.severity === 'failed') return 1
      return (b.failedCount ?? 0) + (b.warningCount ?? 0) - ((a.failedCount ?? 0) + (a.warningCount ?? 0))
    })
  : []

  const totalChecks = data ? data.donutData.reduce((sum: number, item: IntentCheckResult) => sum + item.value, 0) : 0
  const passRate = data && totalChecks > 0 ? ((data.donutData[0].value / totalChecks) * 100).toFixed(1) : '0'

  // Check if we're showing report-level metrics (smaller, more meaningful numbers)
  const isReportLevel = totalChecks < 500 // If less than 500, we're likely showing report counts

  // Use report issues if available (real IP Fabric data), otherwise use device-based issues
  const issuesToDisplay: (ReportIssue | IntentCheckIssue)[] = reportIssues.length > 0 ? reportIssues : data?.issues || []

  // Filter issues based on selected filters
  const filteredIssues = issuesToDisplay.filter((issue: ReportIssue | IntentCheckIssue) => {
    const severityMatch = severityFilter === 'all' || issue.severity === severityFilter
    const categoryMatch = categoryFilter === 'all' || issue.category === categoryFilter
    return severityMatch && categoryMatch
  })

  // Get unique categories from issues
  const issueCategories: string[] = Array.from(new Set(issuesToDisplay.map((i: ReportIssue | IntentCheckIssue) => i.category))).sort()

  const toggleIssueExpanded = (issueKey: string) => {
    const newExpanded = new Set(expandedIssues)
    if (newExpanded.has(issueKey)) {
      newExpanded.delete(issueKey)
    } else {
      newExpanded.add(issueKey)
    }
    setExpandedIssues(newExpanded)
  }


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show API unavailable state (only if not loading and no data)
  if (!loading && loadingBatch >= 5 && !data) {
    return (
      <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardHeader>
          <CardTitle className="dark:text-white/90">Intent Verification Checks</CardTitle>
          <CardDescription className="dark:text-white/60">Network compliance and configuration validation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-white/60">
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3">
                  <svg className="h-12 w-12 text-gray-400 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-lg font-medium dark:text-white/87">Intent Checks API Unavailable</p>
              <p className="text-sm mt-2 text-gray-400 dark:text-white/40">Unable to fetch intent verification data from IP Fabric</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
      <CardHeader>
        <CardTitle className="dark:text-white/90">Intent Verification Checks</CardTitle>
        <CardDescription className="dark:text-white/60">
          Network compliance and configuration validation
          {currentSnapshot && (
            <span className="text-xs text-gray-500 dark:text-white/60 block mt-1">
              Snapshot: {currentSnapshot.displayName}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-blue-100/50 dark:bg-blue-900/30 border border-blue-200/50 dark:border-blue-800/30">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-2xl font-bold dark:text-white/90">{totalChecks}</p>
                <p className="text-sm text-gray-500 dark:text-white/60">{isReportLevel ? 'Total Reports' : 'Total Checks'}</p>
                {isReportLevel && (
                  <p className="text-xs text-gray-400 dark:text-white/40 mt-1">Intent verification rules</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{passRate}%</p>
                <p className="text-sm text-gray-500 dark:text-white/60">Pass Rate</p>
              </div>
            </div>

            {/* Enhanced bar chart visualization */}
            <div className="space-y-4">
              {data && data.donutData.map((item: IntentCheckResult) => {
                const percentage = ((item.value / totalChecks) * 100).toFixed(1)
                const colorClasses = {
                  'Passed': 'bg-green-500 dark:bg-green-400',
                  'Failed': 'bg-red-500 dark:bg-red-400',
                  'Warning': 'bg-orange-500 dark:bg-orange-400'
                }
                const iconColors = {
                  'Passed': 'text-green-600 dark:text-green-400',
                  'Failed': 'text-red-600 dark:text-red-400',
                  'Warning': 'text-orange-600 dark:text-orange-400'
                }
                const bgColors = {
                  'Passed': 'bg-green-50 dark:bg-green-950/30',
                  'Failed': 'bg-red-50 dark:bg-red-950/30',
                  'Warning': 'bg-orange-50 dark:bg-orange-950/30'
                }
                const icons = {
                  'Passed': '✓',
                  'Failed': '✗',
                  'Warning': '⚠'
                }

                // Add button for Failed and Warning to navigate to Issues tab
                const hasViewButton = (item.name === 'Failed' || item.name === 'Warning') && item.value > 0

                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-lg p-1.5 ${bgColors[item.name as keyof typeof bgColors]}`}>
                          <span className={`text-lg font-semibold ${iconColors[item.name as keyof typeof iconColors]}`}>
                            {icons[item.name as keyof typeof icons]}
                          </span>
                        </div>
                        <span className="font-medium text-gray-700 dark:text-white/90">{item.name}</span>
                        {hasViewButton && (
                          <button
                            onClick={() => {
                              setSeverityFilter(item.name.toLowerCase() as 'failed' | 'warning')
                              setActiveTab('issues')
                            }}
                            className={`ml-2 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                              item.name === 'Failed'
                                ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/50 hover:bg-red-200 dark:hover:bg-red-950/70 border border-red-300 dark:border-red-800'
                                : 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/50 hover:bg-orange-200 dark:hover:bg-orange-950/70 border border-orange-300 dark:border-orange-800'
                            }`}
                          >
                            View →
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold dark:text-white/90">{item.value}</span>
                        <span className="text-sm text-gray-500 dark:text-white/60">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="h-4 w-full rounded-lg bg-gray-200 dark:bg-gray-900/50 overflow-hidden border border-gray-200 dark:border-gray-700/30">
                        <div
                          className={`h-full transition-all duration-500 ease-out rounded-lg ${colorClasses[item.name as keyof typeof colorClasses]}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary stats */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500 dark:text-white/60 mb-1">Success Rate</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {data && totalChecks > 0 ? ((data.donutData[0].value / totalChecks) * 100).toFixed(1) : '0'}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-white/60 mb-1">Failure Rate</div>
                  <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                    {data && totalChecks > 0 ? ((data.donutData[1].value / totalChecks) * 100).toFixed(1) : '0'}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-white/60 mb-1">Warning Rate</div>
                  <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {data && totalChecks > 0 ? ((data.donutData[2].value / totalChecks) * 100).toFixed(1) : '0'}%
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3">
              <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as 'all' | 'failed' | 'warning')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issues</SelectItem>
                  <SelectItem value="failed">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500 dark:bg-red-400" />
                      Failed Only
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500 dark:bg-orange-400" />
                      Warning Only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {issueCategories.map((cat: string) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Issues List */}
            <div ref={scrollContainerRef} className="space-y-2 max-h-[800px] overflow-y-auto">
              {filteredIssues.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-white/60">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-white/40" />
                  <p>No issues found with selected filters</p>
                </div>
              ) : (
                filteredIssues.map((issue: ReportIssue | IntentCheckIssue, idx: number) => {
                  // Handle both report-based issues and device-based issues
                  const reportIssue = issue as ReportIssue
                  const deviceIssue = issue as IntentCheckIssue
                  const isReportIssue = 'name' in issue && reportIssue.failedCount !== undefined
                  const displayName = reportIssue.name || deviceIssue.issue
                  const issueKey = `${displayName}_${idx}`

                  // Check if expanded: exact match OR partial match (same issue name, different index)
                  let isExpanded = expandedIssues.has(issueKey)
                  if (!isExpanded) {
                    // Check for partial match: if any expanded issue has the same name
                    const expandedArray = Array.from(expandedIssues)
                    for (const expandedKey of expandedArray) {
                      const expandedName = expandedKey.substring(0, expandedKey.lastIndexOf('_'))
                      if (displayName === expandedName) {
                        isExpanded = true
                        break
                      }
                    }
                  }
                  const iconClass = issue.severity === 'failed' ? 'text-red-500 dark:text-red-400' : 'text-orange-500 dark:text-orange-400'
                  const bgClass = issue.severity === 'failed' ? 'bg-red-50 dark:bg-red-950/20' : 'bg-orange-50 dark:bg-orange-950/20'
                  const borderClass = issue.severity === 'failed' ? 'border-red-200 dark:border-red-800/40' : 'border-orange-200 dark:border-orange-800/40'
                  const issueCount = isReportIssue
                    ? ((reportIssue.failedCount || 0) + (reportIssue.warningCount || 0))
                    : deviceIssue.count

                  return (
                    <div
                      key={issueKey}
                      data-issue-key={issueKey}
                      className={`border rounded-lg p-3 transition-all ${borderClass} ${bgClass}`}
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleIssueExpanded(issueKey)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {issue.severity === 'failed' ? (
                            <AlertCircle className={`h-5 w-5 ${iconClass} flex-shrink-0`} />
                          ) : (
                            <AlertTriangle className={`h-5 w-5 ${iconClass} flex-shrink-0`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white/90">{displayName}</div>
                            <div className="text-sm text-gray-600 dark:text-white/60">
                              {issue.category}
                              {isReportIssue ? (
                                <>
                                  {(reportIssue.criticalCount || 0) > 0 && (
                                    <span className="ml-2">
                                      <span className="text-red-700 dark:text-red-300 font-bold">{reportIssue.criticalCount} critical</span>
                                    </span>
                                  )}
                                  {(reportIssue.failedCount || 0) > 0 && (
                                    <span className="ml-2">
                                      <span className="text-red-600 dark:text-red-400 font-medium">{reportIssue.failedCount} failed</span>
                                    </span>
                                  )}
                                  {(reportIssue.warningCount || 0) > 0 && (
                                    <span className="ml-2">
                                      <span className="text-orange-600 dark:text-orange-400 font-medium">{reportIssue.warningCount} warnings</span>
                                    </span>
                                  )}
                                  <span className="text-gray-400 dark:text-white/40 ml-2">of {reportIssue.totalCount} items</span>
                                </>
                              ) : (
                                <> • Affects {issueCount} device{issueCount !== 1 ? 's' : ''}</>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 text-gray-400 dark:text-white/40 transition-transform flex-shrink-0 ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {isReportIssue ? (
                            // Report-based issue - show description and link to IP Fabric
                            <div className="space-y-3">
                              {/* General Description */}
                              <div className="text-sm text-gray-700 dark:text-white/87">
                                <div className="font-medium dark:text-white/87 mb-1">Description:</div>
                                <p className="text-gray-600 dark:text-white/60">{reportIssue.description}</p>
                              </div>

                              {/* Status Code Breakdown */}
                              {reportIssue.checkDescriptions && (
                                <div className="text-sm space-y-2">
                                  <div className="font-medium text-gray-700 dark:text-white/87">Severity Breakdown:</div>
                                  {(reportIssue.criticalCount || 0) > 0 && reportIssue.checkDescriptions['30'] && (
                                    <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800/40">
                                      <span className="text-red-700 dark:text-red-300 font-bold text-xs mt-0.5">CRITICAL ({reportIssue.criticalCount}):</span>
                                      <span className="text-red-700 dark:text-red-300 text-xs">{reportIssue.checkDescriptions['30']}</span>
                                    </div>
                                  )}
                                  {(reportIssue.failedCount || 0) > 0 && reportIssue.checkDescriptions['20'] && (
                                    <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-950/30 rounded border border-orange-200 dark:border-orange-800/40">
                                      <span className="text-orange-700 dark:text-orange-300 font-semibold text-xs mt-0.5">FAILED ({reportIssue.failedCount}):</span>
                                      <span className="text-orange-700 dark:text-orange-300 text-xs">{reportIssue.checkDescriptions['20']}</span>
                                    </div>
                                  )}
                                  {(reportIssue.warningCount || 0) > 0 && reportIssue.checkDescriptions['10'] && (
                                    <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-200 dark:border-yellow-800/40">
                                      <span className="text-yellow-700 dark:text-yellow-300 font-medium text-xs mt-0.5">WARNING ({reportIssue.warningCount}):</span>
                                      <span className="text-yellow-700 dark:text-yellow-300 text-xs">{reportIssue.checkDescriptions['10']}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* View in IP Fabric button */}
                              {reportIssue.webEndpoint && ipFabricUrl && currentSnapshot && (() => {
                                const webEndpoint = reportIssue.webEndpoint
                                const snapshotId = currentSnapshot.id
                                const separator = webEndpoint.includes('?') ? '&' : '?'
                                const fullUrl = `${ipFabricUrl}${webEndpoint}${separator}selectSnapshot=${encodeURIComponent(snapshotId)}`

                                return (
                                  <a
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    View Details in IP Fabric
                                  </a>
                                )
                              })()}
                            </div>
                          ) : deviceIssue.devices ? (
                            // Device-based issue - show device list
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-white/87">Affected Devices:</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {deviceIssue.devices.slice(0, 10).map((device: string) => (
                                  <button
                                    key={device}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (onDeviceSelect) {
                                        onDeviceSelect(device)
                                      }
                                    }}
                                    className="px-2 py-1 text-xs rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer text-left"
                                    title={`Click to view ${device} in Device Status`}
                                  >
                                    {device}
                                  </button>
                                ))}
                                {deviceIssue.devices.length > 10 && (
                                  <span className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-white/60">
                                    +{deviceIssue.devices.length - 10} more
                                  </span>
                                )}
                              </div>
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Summary */}
            {data && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-white/60">{isReportLevel ? 'Reports with Issues' : 'Issue Types'}</div>
                    <div className="text-lg font-semibold dark:text-white/90">{issuesToDisplay.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-white/60">{isReportLevel ? 'Reports Failed' : 'Total Failed'}</div>
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {data.donutData.find(d => d.name === 'Failed')?.value || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-white/60">{isReportLevel ? 'Reports Warning' : 'Total Warnings'}</div>
                    <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                      {data.donutData.find(d => d.name === 'Warning')?.value || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}