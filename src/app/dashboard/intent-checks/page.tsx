'use client'

import { Suspense, useMemo, useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSnapshotAwareDashboard } from '@/hooks/useSnapshotAwareDashboard'
import { useSnapshotContext } from '@/contexts/SnapshotContext'
import { useDashboardStore } from '@/stores/dashboard-store'
import { IntentChecksChart } from '@/components/charts/IntentChecksChart'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function IntentChecksContent() {
  const { filteredSnapshots } = useSnapshotContext()
  const searchParams = useSearchParams()

  // Read tab parameter from URL (?tab=issues or ?tab=overview)
  const urlTab = searchParams.get('tab')
  const defaultTab = (urlTab === 'issues' || urlTab === 'overview') ? urlTab : 'overview'

  // Get comparison snapshot selection from global store (persists across pages)
  const { selectedComparisonSnapshot } = useDashboardStore()

  // Shared state for synchronizing tab and issue expansion between Latest and Previous snapshots
  const [activeTab, setActiveTab] = useState<string>(defaultTab)
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())

  // Shared state for filter synchronization
  const [severityFilter, setSeverityFilter] = useState<'all' | 'failed' | 'warning'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Refs for synchronized scrolling
  const leftScrollRef = useRef<HTMLDivElement>(null)
  const rightScrollRef = useRef<HTMLDivElement>(null)
  const prevExpandedIssuesRef = useRef<Set<string>>(new Set())
  const isProgrammaticScrollRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const {
    loading,
    currentSnapshot,
    previousSnapshot,
    intentCheckDetails,
    previousIntentCheckDetails,
    loadingBatch,
  } = useSnapshotAwareDashboard(selectedComparisonSnapshot)

  // Format snapshot date for display
  const formatSnapshotDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString

      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
      })
    } catch {
      return dateString
    }
  }

  // Calculate issue counts for display in header
  const currentIssueCount = useMemo(() => {
    if (!intentCheckDetails || !intentCheckDetails.summary) return 0
    const failed = intentCheckDetails.summary.find((s: { name: string; value: number }) => s.name === 'Failed')?.value || 0
    const warning = intentCheckDetails.summary.find((s: { name: string; value: number }) => s.name === 'Warning')?.value || 0
    return failed + warning
  }, [intentCheckDetails])

  const previousIssueCount = useMemo(() => {
    if (!previousIntentCheckDetails || !previousIntentCheckDetails.summary) return 0
    const failed = previousIntentCheckDetails.summary.find((s: { name: string; value: number }) => s.name === 'Failed')?.value || 0
    const warning = previousIntentCheckDetails.summary.find((s: { name: string; value: number }) => s.name === 'Warning')?.value || 0
    return failed + warning
  }, [previousIntentCheckDetails])

  // Auto-expand specific intent check from URL parameter (from notification bell)
  useEffect(() => {
    const checkParam = searchParams.get('check')
    if (!checkParam || !intentCheckDetails || !intentCheckDetails.reports) return

    // Find matching report by name
    const matchingReport = intentCheckDetails.reports.find((r: any) => r.name === checkParam)
    if (matchingReport) {
      // Switch to issues tab
      setActiveTab('issues')

      // Create issue key (matches format from IntentChecksChart)
      // Issue keys are: {reportName}_{index}
      const reportIndex = intentCheckDetails.reports.findIndex((r: any) => r.name === checkParam)
      const issueKey = `${matchingReport.name}_${reportIndex}`

      // Auto-expand the issue
      setExpandedIssues(prev => new Set([...Array.from(prev), issueKey]))

      // Scroll to the issue after a short delay (allow DOM to render)
      setTimeout(() => {
        const element = document.querySelector(`[data-issue-key="${issueKey}"]`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)
    }
  }, [searchParams, intentCheckDetails])

  // Synchronized scrolling between left and right charts
  useEffect(() => {
    const leftScroll = leftScrollRef.current
    const rightScroll = rightScrollRef.current

    // Only sync if both refs exist (both charts are rendered)
    if (!leftScroll || !rightScroll) return

    let isSyncing = false

    const syncLeftToRight = () => {
      if (isSyncing || isProgrammaticScrollRef.current) return
      isSyncing = true
      rightScroll.scrollTop = leftScroll.scrollTop
      requestAnimationFrame(() => {
        isSyncing = false
      })
    }

    const syncRightToLeft = () => {
      if (isSyncing || isProgrammaticScrollRef.current) return
      isSyncing = true
      leftScroll.scrollTop = rightScroll.scrollTop
      requestAnimationFrame(() => {
        isSyncing = false
      })
    }

    leftScroll.addEventListener('scroll', syncLeftToRight)
    rightScroll.addEventListener('scroll', syncRightToLeft)

    return () => {
      leftScroll.removeEventListener('scroll', syncLeftToRight)
      rightScroll.removeEventListener('scroll', syncRightToLeft)
    }
  }, [previousSnapshot]) // Re-run when previous snapshot changes (might appear/disappear)

  // Scroll to issue when expanded
  useEffect(() => {
    // Cancel any pending scroll operation
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = null
    }

    // Find newly expanded issues by comparing with previous state
    const prevExpanded = prevExpandedIssuesRef.current
    const newlyExpandedIssues = Array.from(expandedIssues).filter(
      issue => !prevExpanded.has(issue)
    )

    // Update ref for next comparison
    prevExpandedIssuesRef.current = new Set(expandedIssues)

    // Only scroll if an issue was just expanded (not collapsed)
    if (newlyExpandedIssues.length === 0) {
      isProgrammaticScrollRef.current = false
      return
    }

    const issueToScrollTo = newlyExpandedIssues[newlyExpandedIssues.length - 1]

    // Disable scroll sync immediately
    isProgrammaticScrollRef.current = true

    // Helper function to scroll container to element
    const scrollToElement = (container: HTMLElement, issueKey: string) => {
      // Find the element using data attribute
      const allElements = container.querySelectorAll('[data-issue-key]')
      let targetElement: HTMLElement | null = null

      // Try exact match first
      for (let i = 0; i < allElements.length; i++) {
        const elem = allElements[i]
        const elemKey = elem.getAttribute('data-issue-key')
        if (elemKey === issueKey) {
          targetElement = elem as HTMLElement
          break
        }
      }

      // If no exact match, try partial match (issue name without index)
      if (!targetElement) {
        const issueNameOnly = issueKey.substring(0, issueKey.lastIndexOf('_'))

        for (let i = 0; i < allElements.length; i++) {
          const elem = allElements[i]
          const elemKey = elem.getAttribute('data-issue-key')
          if (elemKey && elemKey.startsWith(issueNameOnly + '_')) {
            targetElement = elem as HTMLElement
            break
          }
        }
      }

      if (targetElement) {
        // Use scrollIntoView which is more reliable
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return true
      } else {
        // Scroll to top as fallback
        container.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return false
    }

    // Wait for React render and CSS transition (duration-300 = 300ms) to complete
    scrollTimeoutRef.current = setTimeout(() => {
      if (leftScrollRef.current) {
        scrollToElement(leftScrollRef.current, issueToScrollTo)
      }

      if (rightScrollRef.current) {
        scrollToElement(rightScrollRef.current, issueToScrollTo)
      }

      // Re-enable scroll sync after a delay
      setTimeout(() => {
        isProgrammaticScrollRef.current = false
        scrollTimeoutRef.current = null
      }, 500)
    }, 450)

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }
    }
  }, [expandedIssues])

  if (loading || loadingBatch < 5) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-96" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2">Intent Verification Checks</h1>
        <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
          Network compliance and configuration validation reports from IP Fabric. These checks verify that your network infrastructure meets intended design and compliance requirements.
        </p>
      </div>

      {/* Two-column comparison layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Latest Snapshot */}
        <div className="space-y-6">
          {/* Header for Latest Snapshot */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Latest Snapshot</h2>
                {currentSnapshot && (
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {currentSnapshot.name === currentSnapshot.id
                      ? currentSnapshot.id === '$last'
                        ? 'Latest Snapshot'
                        : currentSnapshot.id
                      : currentSnapshot.name}
                    <span className="mx-2">•</span>
                    {new Date(currentSnapshot.createdAt).toLocaleDateString()}
                    {currentIssueCount > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="font-medium">{currentIssueCount} {currentIssueCount === 1 ? 'issue' : 'issues'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Intent Checks Chart */}
          <IntentChecksChart
            intentCheckDetails={intentCheckDetails}
            currentSnapshot={currentSnapshot}
            loading={loading || loadingBatch < 5}
            loadingBatch={loadingBatch}
            defaultTab={defaultTab as 'overview' | 'issues'}
            externalActiveTab={activeTab}
            externalSetActiveTab={setActiveTab}
            externalExpandedIssues={expandedIssues}
            externalSetExpandedIssues={setExpandedIssues}
            scrollContainerRef={leftScrollRef}
            externalSeverityFilter={severityFilter}
            externalSetSeverityFilter={setSeverityFilter}
            externalCategoryFilter={categoryFilter}
            externalSetCategoryFilter={setCategoryFilter}
          />
        </div>

        {/* Right Column - Previous Snapshot */}
        <div className="space-y-6">
          {/* Header for Previous Snapshot */}
          {previousSnapshot ? (
            <>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Previous Snapshot</h2>
                    <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {previousSnapshot.name === previousSnapshot.id
                        ? previousSnapshot.id === '$last'
                          ? 'Latest Snapshot'
                          : previousSnapshot.id
                        : previousSnapshot.name}
                      <span className="mx-2">•</span>
                      {new Date(previousSnapshot.createdAt).toLocaleDateString()}
                      {previousIssueCount > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="font-medium">{previousIssueCount} {previousIssueCount === 1 ? 'issue' : 'issues'}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Intent Checks Chart */}
              <IntentChecksChart
                intentCheckDetails={previousIntentCheckDetails}
                currentSnapshot={previousSnapshot}
                loading={loading || loadingBatch < 5}
                loadingBatch={loadingBatch}
                defaultTab={defaultTab as 'overview' | 'issues'}
                externalActiveTab={activeTab}
                externalSetActiveTab={setActiveTab}
                externalExpandedIssues={expandedIssues}
                externalSetExpandedIssues={setExpandedIssues}
                scrollContainerRef={rightScrollRef}
                externalSeverityFilter={severityFilter}
                externalSetSeverityFilter={setSeverityFilter}
                externalCategoryFilter={categoryFilter}
                externalSetCategoryFilter={setCategoryFilter}
              />
            </>
          ) : (
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 dark:text-white/60">No previous snapshot available</p>
                <p className="text-sm text-gray-400 dark:text-white/40 mt-2">
                  This is the oldest snapshot or only one snapshot exists
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IntentChecksPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    }>
      <IntentChecksContent />
    </Suspense>
  )
}
