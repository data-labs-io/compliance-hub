'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getNavigationPath } from '@/lib/navigation'
import { rateLimitedFetch } from '@/lib/rate-limited-fetch'
import { isClientExtensionMode } from '@/lib/client-extension-mode'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { DeviceLoadErrorAlert } from '@/components/alerts/DeviceLoadErrorAlert'
import { ComplianceOverview } from '@/components/compliance/ComplianceOverview'
import { ComplianceFrameworkInfo } from '@/components/compliance/ComplianceFrameworkInfo'
import { ComparisonSummary } from '@/components/compliance/ComparisonSummary'
import { useSnapshotAwareDashboard } from '@/hooks/useSnapshotAwareDashboard'
import { useSnapshotContext } from '@/contexts/SnapshotContext'
import { useDashboardStore } from '@/stores/dashboard-store'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FrameworkSelector } from '@/components/compliance/FrameworkSelector'
import { Progress } from '@/components/ui/progress'
import { GitCompare, TrendingUp, CheckCircle2, Loader2, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// Framework configuration for dynamic dashboard title and description
const FRAMEWORK_CONFIG = {
  'cis-v8': {
    title: 'Rapid Network GAP Analysis',
    description: 'Automated assessment of your network infrastructure against security and compliance frameworks. This dashboard focuses on network-level controls that can be evaluated using IP Fabric\'s discovery data.'
  },
  'pci-dss': {
    title: 'PCI-DSS Compliance Dashboard',
    description: 'Monitor your network infrastructure compliance with Payment Card Industry Data Security Standard requirements for protecting cardholder data.'
  },
  'dora': {
    title: 'DORA Compliance Dashboard',
    description: 'Track compliance with Digital Operational Resilience Act requirements for ICT risk management and operational resilience.'
  },
  'nist': {
    title: 'NIST Cybersecurity Framework Dashboard',
    description: 'Assess your network alignment with NIST Cybersecurity Framework controls for identifying, protecting, detecting, responding, and recovering from cyber threats.'
  },
  'nis2': {
    title: 'NIS2 Directive Compliance Dashboard',
    description: 'Monitor network security measures required under the EU Network and Information Security Directive for essential and important entities.'
  },
  'hipaa': {
    title: 'HIPAA Security Compliance Dashboard',
    description: 'Verify network infrastructure compliance with HIPAA Security Rule technical safeguards for protecting electronic health information.'
  },
  'iso27001': {
    title: 'ISO 27001 Network Controls Dashboard',
    description: 'Track implementation of ISO/IEC 27001 information security controls specific to network infrastructure and communications.'
  }
} as const

export default function DashboardPage() {
  const router = useRouter()
  const [isCheckingSetup, setIsCheckingSetup] = useState(true)
  const [expandedControls, setExpandedControls] = useState<Set<string>>(new Set())

  // Get framework selection, comparison snapshot, and pending control expansion from global store
  const { selectedFramework, selectedComparisonSnapshot, setSelectedComparisonSnapshot, pendingExpandedControl, setPendingExpandedControl, pendingSafeguardId, setPendingSafeguardId } = useDashboardStore()

  // Get devices from global store for error detection
  const devices = useDashboardStore((state) => state.devices)

  // Check if setup is needed and redirect if necessary
  useEffect(() => {
    async function checkSetup() {
      // First check if we're in extension mode (client-side URL check)
      const inExtensionMode = isClientExtensionMode()

      // We need to check if API is configured (either extension mode or standalone session)
      try {
        const response = await rateLimitedFetch('/api/ipfabric/snapshots', undefined, 'setup-check')

        if (response.status === 401) {
          // Unauthorized - token not configured
          if (inExtensionMode) {
            router.push(getNavigationPath('/setup'))
          } else {
            router.push(getNavigationPath('/login'))
          }
          return
        }

        if (response.ok) {
          // API works, allow dashboard to load
          setIsCheckingSetup(false)
        } else {
          // Other error, but not auth related - allow dashboard to show error
          setIsCheckingSetup(false)
        }
      } catch (error) {
        console.error('Dashboard - Error checking API:', error)
        // On network error, redirect to setup/login to be safe
        if (inExtensionMode) {
          router.push(getNavigationPath('/setup'))
        } else {
          router.push(getNavigationPath('/login'))
        }
      }
    }

    checkSetup()
  }, [router])

  // Scroll to section utility function with retry logic for fast scrolling
  const scrollToSection = (sectionId: string, retries = 0, maxRetries = 20) => {
    const element = document.getElementById(sectionId)

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    // Element not found, retry if haven't exceeded max (20 retries × 100ms = 2s max)
    if (retries < maxRetries) {
      setTimeout(() => scrollToSection(sectionId, retries + 1, maxRetries), 100)
    }
  }

  // Get snapshots from context for filtering
  const { snapshots, filteredSnapshots } = useSnapshotContext()

  // Get all data from the hook, passing the comparison snapshot ID
  const {
    metrics,
    previousMetrics,
    loading,
    currentSnapshot,
    previousSnapshot,
    cisControls,
    previousCisControls,
    loadingBatch,
    previousLoadingBatch,
    pciDssRequirements,
    previousPciDssRequirements,
    pciDssLoadingBatch,
    pciDssPreviousLoadingBatch,
    nistFunctions,
    nistLoadingBatch,
    previousNistFunctions,
    nistPreviousLoadingBatch,
    nis2Articles,
    previousNIS2Articles,
    nis2LoadingBatch,
    nis2PreviousLoadingBatch,
  } = useSnapshotAwareDashboard(selectedComparisonSnapshot)

  // Filter snapshots to only show those older than the current snapshot
  const olderSnapshots = useMemo(() => {
    if (!currentSnapshot) return []

    const currentDate = new Date(currentSnapshot.createdAt).getTime()
    return filteredSnapshots
      .filter(snapshot => {
        const snapshotDate = new Date(snapshot.createdAt).getTime()
        return snapshotDate < currentDate
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Newest first
  }, [filteredSnapshots, currentSnapshot])

  // Auto-expand control from store (set by search navigation)
  useEffect(() => {
    // Wait for controls to be loaded before attempting expansion
    if (cisControls.length === 0) return

    if (pendingExpandedControl) {
      // Verify control exists
      const controlExists = cisControls.some(c => c.id === pendingExpandedControl)

      if (controlExists) {
        // Check if control is already expanded
        if (expandedControls.has(pendingExpandedControl)) {
          // Control already expanded - force close then re-open to trigger DOM update
          // This ensures safeguard elements are freshly rendered before scrolling
          setExpandedControls(new Set())

          // Small delay to ensure collapse completes, then re-expand and scroll
          setTimeout(() => {
            setExpandedControls(new Set([pendingExpandedControl]))

            const scrollTarget = pendingSafeguardId
              ? `safeguard-${pendingSafeguardId}`
              : `control-${pendingExpandedControl}`

            scrollToSection(scrollTarget)
          }, 50)
        } else {
          // Normal expansion flow - control not yet expanded
          setExpandedControls(new Set([pendingExpandedControl]))

          const scrollTarget = pendingSafeguardId
            ? `safeguard-${pendingSafeguardId}`
            : `control-${pendingExpandedControl}`

          scrollToSection(scrollTarget)
        }

        // Clear pending states from store
        setPendingExpandedControl(null)
        setPendingSafeguardId(null)
      } else {
        setPendingExpandedControl(null)
        setPendingSafeguardId(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cisControls, pendingExpandedControl, pendingSafeguardId]) // Trigger when controls load OR pending states change

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

  // Get framework configuration based on selected framework for Latest Snapshot
  const frameworkConfig = FRAMEWORK_CONFIG[selectedFramework as keyof typeof FRAMEWORK_CONFIG] || FRAMEWORK_CONFIG['cis-v8']

  // Get current loading batch based on framework
  const currentLoadingBatch = selectedFramework === 'nist'
    ? nistLoadingBatch
    : selectedFramework === 'pci-dss'
      ? pciDssLoadingBatch
      : selectedFramework === 'nis2' ? nis2LoadingBatch
      : loadingBatch
  const currentPreviousLoadingBatch = selectedFramework === 'nist'
    ? nistPreviousLoadingBatch
    : selectedFramework === 'pci-dss'
      ? pciDssPreviousLoadingBatch
      : selectedFramework === 'nis2' ? nis2PreviousLoadingBatch
      : previousLoadingBatch

  // Detect device load error: dashboard shows 0 devices but snapshot metadata says there are devices
  // This indicates an API error (version mismatch, auth, connectivity, etc.)
  const showDeviceLoadError =
    currentLoadingBatch === 5 &&  // Loading complete
    devices.length === 0 &&
    currentSnapshot?.totalDeviceCount != null &&
    currentSnapshot.totalDeviceCount > 0

  // Show loading state while checking setup
  if (isCheckingSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Title and Description */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2">{frameworkConfig.title}</h1>
        <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
          {frameworkConfig.description}
        </p>
      </div>

      {/* Device Load Error Alert - shown when devices fail to load */}
      {showDeviceLoadError && (
        <DeviceLoadErrorAlert
          expectedDeviceCount={currentSnapshot?.totalDeviceCount}
        />
      )}

      {/* Framework Info Section */}
      <ComplianceFrameworkInfo frameworkId={selectedFramework} />

      {/* Snapshot Comparison Summary - Show when comparing snapshots */}
      {previousSnapshot && previousMetrics && (
        <ComparisonSummary
          currentMetrics={metrics}
          previousMetrics={previousMetrics}
          currentControls={cisControls}
          previousControls={previousCisControls}
          currentPciDssRequirements={pciDssRequirements}
          previousPciDssRequirements={previousPciDssRequirements}
          currentNistFunctions={nistFunctions}
          previousNistFunctions={previousNistFunctions}
          selectedFramework={selectedFramework}
          currentSnapshot={currentSnapshot}
          previousSnapshot={previousSnapshot}
        />
      )}

      {/* Two-column comparison layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Latest Snapshot */}
        <div className="space-y-6">
          {/* Important Banner - shown while comparison is loading */}
          {previousSnapshot && currentPreviousLoadingBatch > 0 && currentPreviousLoadingBatch < 5 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-700 rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                    Comparison Required for Accurate Delta-Based Scoring
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                    Loading comparison snapshot to calculate regression penalties and validate improvements (batch {currentPreviousLoadingBatch} of 4)
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 italic">
                    Current scores use fallback logic - final scores will reflect delta conditions once comparison completes
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendation Banner - shown when NO comparison is selected */}
          {!previousSnapshot && currentLoadingBatch === 5 && (
            <div className="bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">Recommendation:</span> Select a comparison snapshot to enable delta-based regression detection. Current scores use fallback logic (no regression penalties applied).
                </p>
              </div>
            </div>
          )}

          {/* Header for Latest Snapshot */}
          <div className={cn(
            "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 min-h-[120px] transition-all duration-300",
            previousSnapshot && currentPreviousLoadingBatch > 0 && currentPreviousLoadingBatch < 5 && "opacity-60 pointer-events-none blur-[1px]"
          )}>
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
                  </div>
                )}
              </div>
              <FrameworkSelector />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className={cn(
            "transition-all duration-300",
            previousSnapshot && currentPreviousLoadingBatch > 0 && currentPreviousLoadingBatch < 5 && "opacity-60 pointer-events-none blur-[1px]"
          )}>
            <MetricsGrid
              metrics={metrics}
              previousMetrics={previousMetrics}
              currentSnapshot={currentSnapshot}
              loading={loading || currentLoadingBatch < 5}
              onTotalDevicesClick={() => router.push(getNavigationPath('/dashboard/devices'))}
              onComplianceScoreClick={() => scrollToSection('compliance-overview')}
              onIntentChecksClick={() => router.push(getNavigationPath('/dashboard/intent-checks'))}
              onActiveAlertsClick={() => router.push(getNavigationPath('/dashboard/alerts'))}
              selectedFramework={selectedFramework}
            />
          </div>

          {/* Compliance Overview */}
          <div id="compliance-overview" className={cn(
            "transition-all duration-300",
            previousSnapshot && currentPreviousLoadingBatch > 0 && currentPreviousLoadingBatch < 5 && "opacity-60 pointer-events-none blur-[1px]"
          )}>
            <ComplianceOverview
              metrics={metrics}
              cisControls={selectedFramework === 'pci-dss' ? [] : cisControls}
              pciDssRequirements={selectedFramework === 'pci-dss' ? pciDssRequirements : []}
              nistFunctions={selectedFramework === 'nist' ? nistFunctions : []}
              nistLoadingBatch={nistLoadingBatch}
              previousNistFunctions={previousNistFunctions}
              currentSnapshot={currentSnapshot}
              loading={loading || currentLoadingBatch < 5}
              selectedFramework={selectedFramework}
              previousMetrics={previousMetrics}
              previousCisControls={selectedFramework === 'pci-dss' ? [] : previousCisControls}
              previousPciDssRequirements={selectedFramework === 'pci-dss' ? previousPciDssRequirements : []}
              showComparison={!!previousSnapshot}
              expandedControls={expandedControls}
              setExpandedControls={setExpandedControls}
              loadingBatch={currentLoadingBatch}
              showGenerateReport={true}
              nis2Articles={selectedFramework === 'nis2' ? nis2Articles : []}
              previousNIS2Articles={selectedFramework === 'nis2' ? previousNIS2Articles : []}
              nis2LoadingBatch={nis2LoadingBatch}
              nis2PreviousLoadingBatch={nis2PreviousLoadingBatch}
            />
          </div>
        </div>

        {/* Right Column - Previous Snapshot */}
        <div className="space-y-6">
          {/* Show loading message while latest snapshot is loading */}
          {!previousSnapshot && currentLoadingBatch > 0 && currentLoadingBatch < 5 && (
            <Card className="border-2 border-dashed border-blue-300 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                <p className="text-blue-700 dark:text-blue-300 font-medium">Loading latest snapshot...</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                  Snapshot comparison will be available once loading completes
                </p>
                <div className="mt-4 text-xs text-blue-600 dark:text-blue-400">
                  Progress: {currentLoadingBatch * 25}%
                </div>
              </CardContent>
            </Card>
          )}

          {/* Header for Previous Snapshot */}
          {previousSnapshot ? (
            <>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 min-h-[120px]">
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
                    </div>
                  </div>
                  {/* Snapshot Selector */}
                  {olderSnapshots.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Compare With</label>
                      <Select
                        value={selectedComparisonSnapshot || '__none__'}
                        onValueChange={(value) => setSelectedComparisonSnapshot(value === '__none__' ? null : value)}
                      >
                        <SelectTrigger className="w-[200px] h-auto min-h-[2.25rem] py-2 bg-white dark:bg-gray-800 dark:border-gray-700">
                          <SelectValue placeholder="Auto-select">
                            {(() => {
                              const compSnapshot = selectedComparisonSnapshot
                                ? snapshots.find(s => s.id === selectedComparisonSnapshot)
                                : previousSnapshot

                              if (!compSnapshot) return <span className="text-gray-400 dark:text-gray-500">Auto-select</span>

                              return (
                                <div className="flex items-center gap-2 text-left">
                                  <div className="flex-shrink-0">
                                    <div className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-400" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm truncate">
                                      {compSnapshot.name === compSnapshot.id ?
                                        (compSnapshot.id === '$last' ? 'Latest Snapshot' : compSnapshot.id) :
                                        compSnapshot.name
                                      }
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {formatSnapshotDate(compSnapshot.createdAt)}
                                    </div>
                                  </div>
                                </div>
                              )
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="w-[calc(16rem-2rem)] max-w-[20rem]">
                          {/* Option for no comparison (default) */}
                          <SelectItem value="__none__">
                            <div className="flex w-full items-start gap-2 p-2">
                              <div className="mt-1.5 flex-shrink-0">
                                <div className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm leading-5 text-gray-900 dark:text-gray-100">
                                  No comparison
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 leading-4 mt-0.5">
                                  View latest snapshot only (faster loading)
                                </div>
                              </div>
                            </div>
                          </SelectItem>

                          {/* List of older snapshots */}
                          {olderSnapshots.map((snapshot) => (
                            <SelectItem
                              key={snapshot.id}
                              value={snapshot.id}
                              className="p-0"
                            >
                              <div className="flex w-full items-start gap-2 p-2">
                                <div className="mt-1.5 flex-shrink-0">
                                  <div className="relative">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <div className="absolute inset-0 h-2 w-2 animate-pulse rounded-full bg-green-500 opacity-75" />
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm leading-5 text-gray-900 dark:text-gray-100 truncate">
                                    {snapshot.displayName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-4 mt-0.5">
                                    {formatSnapshotDate(snapshot.createdAt)}
                                  </div>
                                  {snapshot.note && snapshot.note !== 'Untitled' && (
                                    <div className="text-xs text-gray-400 leading-4 mt-1 truncate" title={snapshot.note}>
                                      {snapshot.note}
                                    </div>
                                  )}
                                  {snapshot.version && (
                                    <div className="text-[10px] text-gray-400 leading-3 mt-1">
                                      v{snapshot.version}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <MetricsGrid
                metrics={previousMetrics || metrics}
                previousMetrics={null}
                currentSnapshot={previousSnapshot}
                loading={loading || currentPreviousLoadingBatch < 5}
                onTotalDevicesClick={() => router.push(getNavigationPath('/dashboard/devices'))}
                onComplianceScoreClick={() => scrollToSection('compliance-overview-previous')}
                onIntentChecksClick={() => router.push(getNavigationPath('/dashboard/intent-checks'))}
                onActiveAlertsClick={() => router.push(getNavigationPath('/dashboard/alerts'))}
                isPreviousSnapshotView={true}
                selectedFramework={selectedFramework}
                controlCount={
                  selectedFramework === 'nist'
                    ? previousNistFunctions?.length || 0
                    : selectedFramework === 'pci-dss'
                      ? previousPciDssRequirements?.length || 0
                      : selectedFramework === 'nis2'
                        ? previousNIS2Articles?.length || 0
                        : previousCisControls?.length || 0
                }
                metricsCount={
                  selectedFramework === 'nist'
                    ? previousNistFunctions?.reduce((sum, func) => sum + (func.details?.length || 0), 0) || 0
                    : selectedFramework === 'pci-dss'
                      ? previousPciDssRequirements?.reduce((sum, req) => sum + (req.details?.length || 0), 0) || 0
                      : selectedFramework === 'nis2'
                        ? previousNIS2Articles?.reduce((sum, a) => sum + (a.details?.length || 0), 0) || 0
                        : previousCisControls?.reduce((sum, ctrl) => sum + (ctrl.details?.length || 0), 0) || 0
                }
                currentComplianceScore={metrics.complianceScore ?? 0}
              />

              {/* Compliance Overview */}
              <div id="compliance-overview-previous">
                <ComplianceOverview
                  metrics={previousMetrics || metrics}
                  cisControls={selectedFramework === 'pci-dss' ? [] : previousCisControls}
                  pciDssRequirements={selectedFramework === 'pci-dss' ? previousPciDssRequirements : []}
                  nistFunctions={selectedFramework === 'nist' ? previousNistFunctions : []}
                  nistLoadingBatch={nistLoadingBatch}
                  previousNistFunctions={previousNistFunctions}
                  currentSnapshot={previousSnapshot}
                  loading={loading || currentPreviousLoadingBatch < 5}
                  selectedFramework={selectedFramework}
                  expandedControls={expandedControls}
                  setExpandedControls={setExpandedControls}
                  showGenerateReport={false}
                  loadingBatch={currentPreviousLoadingBatch}
                  isPreviousSnapshotView={true}
                  currentCisControls={cisControls}
                  currentPciDssRequirements={pciDssRequirements}
                  currentNistFunctions={nistFunctions}
                  nis2Articles={selectedFramework === 'nis2' ? previousNIS2Articles : []}
                  previousNIS2Articles={selectedFramework === 'nis2' ? previousNIS2Articles : []}
                  nis2LoadingBatch={nis2PreviousLoadingBatch}
                  nis2PreviousLoadingBatch={nis2PreviousLoadingBatch}
                  currentNIS2Articles={selectedFramework === 'nis2' ? nis2Articles : []}
                />
              </div>
            </>
          ) : currentLoadingBatch === 5 ? (
            <Card className="border-2 border-dashed border-blue-300 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <GitCompare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
                      Enable Snapshot Comparison
                    </CardTitle>
                    <CardDescription className="text-blue-700 dark:text-blue-300">
                      Select a previous snapshot to see how your network has evolved
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Prominent Snapshot Selector */}
                  {olderSnapshots.length > 0 ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2 block">
                          Choose snapshot to compare with Latest:
                        </label>
                        <Select
                          value={selectedComparisonSnapshot || "__placeholder__"}
                          onValueChange={(value) => {
                            if (value !== "__placeholder__") {
                              setSelectedComparisonSnapshot(value)
                            }
                          }}
                        >
                          <SelectTrigger className="w-full h-12 border-2 border-blue-300 dark:border-blue-800 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-700 transition-colors">
                            <SelectValue placeholder="Choose a snapshot to compare..." />
                          </SelectTrigger>
                          <SelectContent className="max-w-md">
                            <SelectItem value="__placeholder__" disabled className="text-gray-400 dark:text-gray-500">
                              Choose a snapshot...
                            </SelectItem>
                            {olderSnapshots.map((snapshot) => (
                              <SelectItem key={snapshot.id} value={snapshot.id}>
                                <div className="flex items-center gap-3 py-1">
                                  <div className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                      {snapshot.displayName}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatSnapshotDate(snapshot.createdAt)}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Benefits List */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          Why compare snapshots?
                        </p>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <span>Track analysis score improvements over time</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <span>Identify configuration and security changes</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <span>See control-level score deltas (+/-)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <span>Measure network security posture trends</span>
                          </li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-blue-200 dark:border-blue-800 text-center">
                      <p className="text-gray-600 dark:text-gray-400">No previous snapshots available</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        This is the only snapshot or the oldest snapshot
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>

      <Skeleton className="h-64" />
    </div>
  )
}