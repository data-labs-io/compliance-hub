import { useEffect, useState, useCallback, useRef } from 'react'
import { useSnapshotContext } from '@/contexts/SnapshotContext'
import { DashboardMetrics, useDashboardStore } from '@/stores/dashboard-store'
import { calculateCISControlsProgressive, calculateOverallCISScore, enrichControlsWithDeltas, extractMetricsFromControls, recalculateControlsWithMetrics, type CISControl } from '@/frameworks/cis'
import { calculatePCIDSSRequirementsProgressive, calculateOverallPCIDSSScore, recalculatePCIDSSWithMetrics, extractMetricsFromRequirements, type PCIDSSRequirement } from '@/frameworks/pci-dss'
import { calculateNISTCSFProgressive, calculateOverallNISTCSFScore, type NISTCSFFunction } from '@/frameworks/nist-csf'
import { calculateNIS2Progressive, calculateOverallNIS2Score, type NIS2Article } from '@/frameworks/nis2'
import { calculateActiveAlerts } from '@/lib/alerts-calculator'
import { useIPFabricAPICall } from '@/hooks/useIPFabricAPI'
import { getDevices, getIntentChecks } from '@/services/device-api'
import { usePathname } from 'next/navigation'
import { cachedApiCall } from '@/lib/request-cache'
import { rateLimiter } from '@/lib/rate-limiter'
import type { DataAvailabilitySummary, MissingDataWarning } from '@/types/data-availability'
import { calculateConfidenceLevel, getImpactDescription, getCISControlImpacts } from '@/types/data-availability'

export function useSnapshotAwareDashboard(comparisonSnapshotId?: string | null) {
  const pathname = usePathname()
  const { selectedSnapshot, getCurrentSnapshot, snapshots } = useSnapshotContext()
  const { setMetrics: setGlobalMetrics, setSelectedComparisonSnapshot: setGlobalComparisonSnapshot, clearSnapshotCache } = useDashboardStore()
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalDevices: 0,
    activeAlerts: 0,
    complianceScore: 0,
    intentChecksPassed: 0,
    intentChecksFailed: 0,
    lastUpdated: null,
  })
  const [previousMetrics, setPreviousMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  // CRITICAL: Use Zustand selectors (not destructuring) for devices and intentCheckDetails
  // This ensures components re-render when these values change in the store
  const devices = useDashboardStore((state) => state.devices)
  const intentCheckDetails = useDashboardStore((state) => state.intentCheckDetails)
  const setDevices = useDashboardStore((state) => state.setDevices)
  const setIntentCheckDetails = useDashboardStore((state) => state.setIntentCheckDetails)

  // CIS state
  const [cisControls, setCisControls] = useState<CISControl[]>([])
  const [loadingBatch, setLoadingBatch] = useState<number>(0) // 0=not started, 1-4=loading batch, 5=complete
  const [previousLoadingBatch, setPreviousLoadingBatch] = useState<number>(0) // For previous snapshot loading
  const [dataAvailability, setDataAvailability] = useState<DataAvailabilitySummary>({
    completeData: true,
    availableDataSources: [],
    missingDataSources: [],
    confidenceLevel: 'high',
    affectedMetrics: [],
    overallImpact: 'All data available'
  })

  // PCI-DSS state
  const [pciDssRequirements, setPciDssRequirements] = useState<PCIDSSRequirement[]>([])
  const [pciDssLoadingBatch, setPciDssLoadingBatch] = useState<number>(0)
  const [pciDssPreviousLoadingBatch, setPciDssPreviousLoadingBatch] = useState<number>(0)

  // NIST state
  const [nistFunctions, setNistFunctions] = useState<NISTCSFFunction[]>([])
  const [nistLoadingBatch, setNistLoadingBatch] = useState<number>(0)
  const [nistPreviousLoadingBatch, setNistPreviousLoadingBatch] = useState<number>(0)
  const [previousNistFunctions, setPreviousNistFunctions] = useState<NISTCSFFunction[]>([])

  // NIS2 state
  const [nis2Articles, setNIS2Articles] = useState<NIS2Article[]>([])
  const [previousNIS2Articles, setPreviousNIS2Articles] = useState<NIS2Article[]>([])
  const [nis2LoadingBatch, setNIS2LoadingBatch] = useState(0)
  const [nis2PreviousLoadingBatch, setNIS2PreviousLoadingBatch] = useState(0)

  // NIS2 fetch-in-progress tracking
  const [isFetchingNIS2Current, setIsFetchingNIS2Current] = useState(false)

  // State for previous snapshot's complete data
  const [previousDevices, setPreviousDevices] = useState<any[]>([])
  const [previousIntentCheckDetails, setPreviousIntentCheckDetails] = useState<any>(null)
  const [previousCisControls, setPreviousCisControls] = useState<CISControl[]>([])
  const [previousPciDssRequirements, setPreviousPciDssRequirements] = useState<PCIDSSRequirement[]>([])
  const [previousDataAvailability, setPreviousDataAvailability] = useState<DataAvailabilitySummary>({
    completeData: true,
    availableDataSources: [],
    missingDataSources: [],
    confidenceLevel: 'high',
    affectedMetrics: [],
    overallImpact: 'All data available'
  })
  const [previousSnapshot, setPreviousSnapshot] = useState<any>(null)
  const apiCall = useIPFabricAPICall()

  // Wrapper to inject groupId into API calls for rate limiter grouping
  const createGroupedApiCall = useCallback((groupId: string) => {
    return async <T = any>(endpoint: string, options: any = {}): Promise<T> => {
      return apiCall(endpoint, { ...options, groupId })
    }
  }, [apiCall])

  // Fetch version ref for cancel & switch behavior
  // Incremented on each fetch trigger; checked to abort stale fetches
  const fetchVersionRef = useRef(0)

  // Track previous framework/snapshot for rate limiter group abort
  const previousFetchGroupRef = useRef<string | null>(null)

  // Track remount vs real snapshot change
  const isInitialMount = useRef(true)
  const previousSnapshotRef = useRef(selectedSnapshot)

  // Use global store for fetching state and cache instead of local refs
  const {
    selectedFramework,
    // NOTE: devices, setDevices, intentCheckDetails, setIntentCheckDetails
    // are now read via selectors above (not destructured) to ensure re-renders
    // CIS cache
    currentSnapshotData,
    previousSnapshotData,
    setCurrentSnapshotData,
    setPreviousSnapshotData,
    updateCurrentSnapshotData,
    updatePreviousSnapshotData,
    isFetchingCurrent,
    isFetchingPrevious,
    setIsFetchingCurrent,
    setIsFetchingPrevious,
    // PCI-DSS cache
    pciDssCurrentSnapshotData,
    pciDssPreviousSnapshotData,
    setPciDssCurrentSnapshotData,
    setPciDssPreviousSnapshotData,
    updatePciDssCurrentSnapshotData,
    updatePciDssPreviousSnapshotData,
    isFetchingPciDssCurrent,
    isFetchingPciDssPrevious,
    setIsFetchingPciDssCurrent,
    setIsFetchingPciDssPrevious,
    // NIST cache
    nistCurrentSnapshotData,
    nistPreviousSnapshotData,
    setNistCurrentSnapshotData,
    setNistPreviousSnapshotData,
    updateNistCurrentSnapshotData,
    updateNistPreviousSnapshotData,
    isFetchingNistCurrent,
    isFetchingNistPrevious,
    setIsFetchingNistCurrent,
    setIsFetchingNistPrevious,
    // NIS2 cache
    nis2CurrentSnapshotData,
    setNIS2CurrentSnapshotData,
    updateNIS2CurrentSnapshotData,
    nis2PreviousSnapshotData,
    setNIS2PreviousSnapshotData,
    cacheNIS2Snapshot,
  } = useDashboardStore()

  // Check if we're in demo mode
  const isDemoMode = pathname?.includes('/demo')

  // Helper function to calculate metrics for a snapshot
  const calculateMetricsForSnapshot = useCallback(async (
    snapshotId: string,
    previousSnapshotId?: string | null,
    previousSnapshotDevices?: any[]
  ): Promise<DashboardMetrics & { devices?: any[], intentCheckDetails?: any, dataAvailability?: DataAvailabilitySummary }> => {
    // Track data availability
    const availableDataSources: string[] = []
    const missingDataWarnings: MissingDataWarning[] = []

    // Fetch devices from API or use simulated data
    const devices = await getDevices(snapshotId, apiCall, isDemoMode)
    if (devices.length > 0) {
      availableDataSources.push('Device Inventory')
    }

    // Get intent checks from API (returns null if unavailable)
    const intentChecks = await getIntentChecks(snapshotId, devices, apiCall, isDemoMode)
    if (intentChecks === null && !isDemoMode) {
      missingDataWarnings.push({
        dataType: 'Intent Verification Checks',
        endpoint: 'reports',
        impact: 'Cannot validate network compliance rules. CIS Control 1.3 scored as 0.',
        severity: 'high',
        affectedMetrics: ['Intent Checks', 'CIS Control 1.3'],
        recommendation: 'Connect to IP Fabric Enterprise instance with Intent Verification enabled'
      })
    } else if (intentChecks) {
      availableDataSources.push('Intent Checks')
    }

    // Use the real API data directly - no synthetic calculation
    const intentCheckResults = intentChecks
      ? {
          summary: [
            { name: 'Passed', value: intentChecks.passed, color: 'green' },
            { name: 'Failed', value: intentChecks.failed, color: 'red' },
            { name: 'Warning', value: intentChecks.warning, color: 'orange' },
          ],
          categories: [],  // Categories extracted from reports in UI component
          totalChecks: intentChecks.passed + intentChecks.failed + intentChecks.warning,
          issues: [],  // Issues extracted from reports in UI component
          reports: (intentChecks as any).reports || []  // Pass through full reports data if available
        }
      : null

    // Use progressive loading to avoid rate limits
    const controlsData = await calculateCISControlsProgressive(
      devices,
      snapshotId,
      intentChecks?.passed || 0,
      intentChecks?.failed || 0,
      apiCall,
      previousSnapshotId,
      previousSnapshotDevices,
      (batchNum, partialControls, totalBatches) => {
        // Update loading batch state
        setLoadingBatch(batchNum)

        // Update ONLY the loaded controls, keep others in loading state
        setCisControls(currentControls => {
          return currentControls.map(control => {
            // Find if this control was loaded in this batch
            const loadedControl = partialControls.find(c => c.id === control.id)
            // If found, replace with loaded data. If not, keep existing (loading) state
            return loadedControl || control
          })
        })

        // Recalculate compliance score with partial data
        const partialScore = calculateOverallCISScore(partialControls)
        setMetrics(prev => ({...prev, complianceScore: partialScore}))

        // Update global cache with progressive data
        updateCurrentSnapshotData({
          loadingBatch: batchNum,
          cisControls: partialControls
        })
      }
    )
    const complianceScore = calculateOverallCISScore(controlsData)

    // Mark loading as complete
    setLoadingBatch(5)

    const activeAlerts = calculateActiveAlerts(
      devices,
      complianceScore,
      intentChecks?.failed || 0,
      controlsData
    )

    // Calculate data availability summary
    const totalDataSources = 6 // Expected: devices, intent checks, discovery errors, EoS, version variance, sites
    const confidenceLevel = calculateConfidenceLevel(availableDataSources.length, totalDataSources)

    const dataAvailabilitySummary: DataAvailabilitySummary = {
      completeData: missingDataWarnings.length === 0,
      availableDataSources,
      missingDataSources: missingDataWarnings,
      confidenceLevel,
      affectedMetrics: Array.from(new Set(missingDataWarnings.flatMap(w => w.affectedMetrics || []))),
      overallImpact: missingDataWarnings.length === 0
        ? 'All data sources available'
        : `${missingDataWarnings.length} data source(s) unavailable. Metrics may not reflect actual network state.`
    }

    return {
      totalDevices: devices.length,
      activeAlerts,
      complianceScore,
      intentChecksPassed: intentChecks?.passed || 0,
      intentChecksFailed: intentChecks?.failed || 0,
      intentChecksAvailable: intentChecks !== null,  // New field to indicate API availability
      lastUpdated: new Date(),
      devices,
      intentCheckDetails: intentCheckResults,
      cisControls: controlsData,
      dataAvailability: dataAvailabilitySummary
    } as DashboardMetrics & { devices: any[], intentCheckDetails: any, cisControls: CISControl[], intentChecksAvailable: boolean, dataAvailability: DataAvailabilitySummary }
  }, [apiCall, isDemoMode, updateCurrentSnapshotData])

  useEffect(() => {
    // Cancel & switch: increment version to invalidate any in-progress fetches
    const currentFetchVersion = ++fetchVersionRef.current

    // Capture framework at start of effect (for proper cleanup in finally block)
    const frameworkForThisFetch = selectedFramework
    const currentFetchGroup = `${selectedFramework}-${selectedSnapshot}`

    // Abort any pending requests from the previous framework/snapshot group
    // This ensures clean switching without overlapping API calls
    if (previousFetchGroupRef.current && previousFetchGroupRef.current !== currentFetchGroup) {
      rateLimiter.abortGroup(previousFetchGroupRef.current)
    }
    previousFetchGroupRef.current = currentFetchGroup

    // Create grouped API call for this fetch (includes rate limiter groupId)
    const groupedApiCall = createGroupedApiCall(currentFetchGroup)

    const fetchSnapshotData = async () => {
      // Helper to check if this fetch is still valid (not superseded by newer fetch)
      const isStale = () => fetchVersionRef.current !== currentFetchVersion

      // NEW: Check multi-snapshot cache for INSTANT switching
      // This enables instant restore of previously loaded snapshots
      const multiCache = frameworkForThisFetch === 'cis-v8'
        ? useDashboardStore.getState().snapshotCache
        : frameworkForThisFetch === 'pci-dss'
          ? useDashboardStore.getState().pciDssSnapshotCache
          : frameworkForThisFetch === 'nis2'
            ? useDashboardStore.getState().nis2SnapshotCache
            : useDashboardStore.getState().nistSnapshotCache

      const cachedFromMulti = multiCache[selectedSnapshot]

      if (cachedFromMulti && cachedFromMulti.loadingBatch >= 5) {
        console.log(`[Dashboard] INSTANT SWITCH from multi-cache: ${selectedSnapshot} (${frameworkForThisFetch})`)

        // Promote cached data to currentSnapshotData
        if (frameworkForThisFetch === 'cis-v8') {
          const cisCache = cachedFromMulti as import('@/stores/dashboard-store').SnapshotData
          setCurrentSnapshotData(cisCache)
          setCisControls(cisCache.cisControls)
          setDataAvailability(cisCache.dataAvailability)
          setLoadingBatch(cisCache.loadingBatch)
          if (cisCache.intentCheckDetails) {
            setIntentCheckDetails(cisCache.intentCheckDetails)
          }
        } else if (frameworkForThisFetch === 'pci-dss') {
          const pciCache = cachedFromMulti as import('@/stores/dashboard-store').PCIDSSSnapshotData
          setPciDssCurrentSnapshotData(pciCache)
          setPciDssRequirements(pciCache.pciDssRequirements)
          setPciDssLoadingBatch(pciCache.loadingBatch)
          if (pciCache.intentCheckDetails) {
            setIntentCheckDetails(pciCache.intentCheckDetails)
          }
        } else if (frameworkForThisFetch === 'nis2') {
          const nis2Cache = cachedFromMulti as import('@/stores/dashboard-store').NIS2SnapshotData
          setNIS2CurrentSnapshotData(nis2Cache)
          setNIS2Articles(nis2Cache.nis2Articles)
          setNIS2LoadingBatch(nis2Cache.loadingBatch)
          if (nis2Cache.intentCheckDetails) {
            setIntentCheckDetails(nis2Cache.intentCheckDetails)
          }
        } else {
          const nistCache = cachedFromMulti as import('@/stores/dashboard-store').NISTSnapshotData
          setNistCurrentSnapshotData(nistCache)
          setNistFunctions(nistCache.nistFunctions)
          setNistLoadingBatch(nistCache.loadingBatch)
          if (nistCache.intentCheckDetails) {
            setIntentCheckDetails(nistCache.intentCheckDetails)
          }
        }

        // Restore shared state
        setMetrics(cachedFromMulti.metrics)
        setGlobalMetrics(cachedFromMulti.metrics)
        setDevices(cachedFromMulti.devices)
        setLoading(false)

        // IMPORTANT: Also restore comparison data if available in cache
        const comparisonSnapshotId = useDashboardStore.getState().selectedComparisonSnapshot
        if (comparisonSnapshotId && multiCache[comparisonSnapshotId]) {
          const cachedComparison = multiCache[comparisonSnapshotId]
          if (cachedComparison.loadingBatch >= 5) {
            console.log(`[Dashboard] Also restoring comparison data from cache: ${comparisonSnapshotId}`)
            setPreviousMetrics(cachedComparison.metrics)
            setPreviousDevices(cachedComparison.devices)

            if (frameworkForThisFetch === 'cis-v8') {
              const cisCompCache = cachedComparison as import('@/stores/dashboard-store').SnapshotData
              setPreviousCisControls(cisCompCache.cisControls || [])
              setPreviousDataAvailability(cisCompCache.dataAvailability)
              if (cisCompCache.intentCheckDetails) {
                setPreviousIntentCheckDetails(cisCompCache.intentCheckDetails)
              }
            } else if (frameworkForThisFetch === 'pci-dss') {
              const pciCompCache = cachedComparison as import('@/stores/dashboard-store').PCIDSSSnapshotData
              setPreviousPciDssRequirements(pciCompCache.pciDssRequirements || [])
              if (pciCompCache.intentCheckDetails) {
                setPreviousIntentCheckDetails(pciCompCache.intentCheckDetails)
              }
            } else if (frameworkForThisFetch === 'nis2') {
              const nis2CompCache = cachedComparison as import('@/stores/dashboard-store').NIS2SnapshotData
              setPreviousNIS2Articles(nis2CompCache.nis2Articles || [])
              if (nis2CompCache.intentCheckDetails) {
                setPreviousIntentCheckDetails(nis2CompCache.intentCheckDetails)
              }
            } else {
              const nistCompCache = cachedComparison as import('@/stores/dashboard-store').NISTSnapshotData
              setPreviousNistFunctions(nistCompCache.nistFunctions || [])
              if (nistCompCache.intentCheckDetails) {
                setPreviousIntentCheckDetails(nistCompCache.intentCheckDetails)
              }
            }

            setPreviousSnapshot(snapshots.find(s => s.id === comparisonSnapshotId) || null)
            setPreviousLoadingBatch(cachedComparison.loadingBatch)
            if (frameworkForThisFetch === 'pci-dss') {
              setPciDssPreviousLoadingBatch(cachedComparison.loadingBatch)
            } else if (frameworkForThisFetch === 'nist') {
              setNistPreviousLoadingBatch(cachedComparison.loadingBatch)
            } else if (frameworkForThisFetch === 'nis2') {
              setNIS2PreviousLoadingBatch(cachedComparison.loadingBatch)
            }
          }
        }

        return  // INSTANT - no fetch needed
      }

      // Check if data is already cached and matches the selected snapshot
      // Do this FIRST so component always has state to display
      // Route to appropriate cache based on framework
      const cachedData = frameworkForThisFetch === 'cis-v8'
        ? currentSnapshotData
        : frameworkForThisFetch === 'pci-dss'
          ? pciDssCurrentSnapshotData
          : frameworkForThisFetch === 'nis2'
            ? nis2CurrentSnapshotData
            : nistCurrentSnapshotData
      const isFetching = frameworkForThisFetch === 'cis-v8'
        ? isFetchingCurrent
        : frameworkForThisFetch === 'pci-dss'
          ? isFetchingPciDssCurrent
          : frameworkForThisFetch === 'nis2'
            ? isFetchingNIS2Current
            : isFetchingNistCurrent
      const setFetching = frameworkForThisFetch === 'cis-v8'
        ? setIsFetchingCurrent
        : frameworkForThisFetch === 'pci-dss'
          ? setIsFetchingPciDssCurrent
          : frameworkForThisFetch === 'nis2'
            ? setIsFetchingNIS2Current
            : setIsFetchingNistCurrent

      if (cachedData && cachedData.snapshotId === selectedSnapshot) {
        // Check if cache is incomplete (loading wasn't finished)
        if (cachedData.loadingBatch && cachedData.loadingBatch < 5) {
          // Check if background fetch is already running
          if (isFetching) {
            // Background loading in progress - restore partial cache and wait for it to complete
            console.log(`[Dashboard] ${frameworkForThisFetch} background fetch in progress (batch ${cachedData.loadingBatch}), restoring partial cache`)
            setMetrics(cachedData.metrics)
            setGlobalMetrics(cachedData.metrics)
            setDevices(cachedData.devices)

            if (frameworkForThisFetch === 'cis-v8' && 'cisControls' in cachedData) {
              setCisControls(cachedData.cisControls)
              setDataAvailability(cachedData.dataAvailability)
              setLoadingBatch(cachedData.loadingBatch)
              if (cachedData.intentCheckDetails) setIntentCheckDetails(cachedData.intentCheckDetails)
            } else if (frameworkForThisFetch === 'pci-dss' && 'pciDssRequirements' in cachedData) {
              setPciDssRequirements(cachedData.pciDssRequirements)
              setPciDssLoadingBatch(cachedData.loadingBatch)
              if (cachedData.intentCheckDetails) setIntentCheckDetails(cachedData.intentCheckDetails)
            } else if (frameworkForThisFetch === 'nis2' && 'nis2Articles' in cachedData) {
              setNIS2Articles((cachedData as import('@/stores/dashboard-store').NIS2SnapshotData).nis2Articles)
              setNIS2LoadingBatch(cachedData.loadingBatch)
              if (cachedData.intentCheckDetails) setIntentCheckDetails(cachedData.intentCheckDetails)
            } else if (frameworkForThisFetch === 'nist' && 'nistFunctions' in cachedData) {
              setNistFunctions(cachedData.nistFunctions)
              setNistLoadingBatch(cachedData.loadingBatch)
              if (cachedData.intentCheckDetails) setIntentCheckDetails(cachedData.intentCheckDetails)
            }

            setLoading(false)
            return  // Let background fetch complete
          }

          // No background fetch - incomplete cache is stale, invalidate and refetch
          console.log(`[Dashboard] Stale incomplete ${frameworkForThisFetch} cache detected (batch ${cachedData.loadingBatch}), invalidating`)
          if (frameworkForThisFetch === 'cis-v8') {
            clearSnapshotCache()
          } else if (frameworkForThisFetch === 'pci-dss') {
            useDashboardStore.getState().clearPciDssSnapshotCache()
          } else if (frameworkForThisFetch === 'nis2') {
            useDashboardStore.getState().setNIS2CurrentSnapshotData(null)
          } else {
            useDashboardStore.getState().clearNistSnapshotCache()
          }
          // Fall through to start fresh fetch
        } else {
          // Cache is complete, restore state from cache
          console.log(`[Dashboard] Using cached ${frameworkForThisFetch} snapshot data: ${selectedSnapshot}`)
          setMetrics(cachedData.metrics)
          setGlobalMetrics(cachedData.metrics)
          setDevices(cachedData.devices)

          if (frameworkForThisFetch === 'cis-v8' && 'cisControls' in cachedData) {
            setCisControls(cachedData.cisControls)
            setDataAvailability(cachedData.dataAvailability)
            setLoadingBatch(cachedData.loadingBatch)
            if (cachedData.intentCheckDetails) setIntentCheckDetails(cachedData.intentCheckDetails)
          } else if (frameworkForThisFetch === 'pci-dss' && 'pciDssRequirements' in cachedData) {
            setPciDssRequirements(cachedData.pciDssRequirements)
            setPciDssLoadingBatch(cachedData.loadingBatch)
            if (cachedData.intentCheckDetails) setIntentCheckDetails(cachedData.intentCheckDetails)
          } else if (frameworkForThisFetch === 'nis2' && 'nis2Articles' in cachedData) {
            setNIS2Articles((cachedData as import('@/stores/dashboard-store').NIS2SnapshotData).nis2Articles)
            setNIS2LoadingBatch(cachedData.loadingBatch)
            if (cachedData.intentCheckDetails) setIntentCheckDetails(cachedData.intentCheckDetails)
          } else if (frameworkForThisFetch === 'nist' && 'nistFunctions' in cachedData) {
            setNistFunctions(cachedData.nistFunctions)
            setNistLoadingBatch(cachedData.loadingBatch)
            if (cachedData.intentCheckDetails) setIntentCheckDetails(cachedData.intentCheckDetails)
          }

          setLoading(false)
          return  // Use cached data, no fetch needed
        }
      }

      // CRITICAL: Prevent duplicate fetches - check guard and set flag
      // Now checked AFTER cache restoration so component has state
      if (isFetching) {
        return
      }

      // Cancel & switch: abort if this fetch was superseded
      if (isStale()) {
        console.log(`[Dashboard] Fetch version ${currentFetchVersion} aborted - newer fetch started`)
        return
      }

      setFetching(true)

      try {
        // Check if new snapshot has cached data (multiCache already computed above)
        const newSnapshotCache = multiCache[selectedSnapshot]
        const newSnapshotHasCache = newSnapshotCache && newSnapshotCache.loadingBatch >= 5

        // Only treat as "real change" if:
        // 1. Snapshot ID actually changed
        // 2. Previous snapshot was different
        // 3. New snapshot has NO cache (indicating fresh selection)
        // If cache exists, it's a remount or ID resolution ($last → actual ID), not a real change
        const isRealSnapshotChange =
          cachedData &&
          cachedData.snapshotId !== selectedSnapshot &&
          previousSnapshotRef.current !== selectedSnapshot &&
          !isInitialMount.current &&
          !newSnapshotHasCache  // KEY: If cache exists, preserve data

        // CRITICAL: When selected snapshot changes, clear comparison to prevent data mixing
        if (cachedData && cachedData.snapshotId !== selectedSnapshot) {
          // Only clear comparison data if this is a REAL user-initiated snapshot change
          if (isRealSnapshotChange) {
            console.log('[useSnapshotAwareDashboard] Real snapshot change detected, clearing comparison data')
            setGlobalComparisonSnapshot(null)  // Clear comparison selection
            setPreviousMetrics(null)
            setPreviousCisControls([])
            setPreviousPciDssRequirements([])
            setPreviousSnapshot(null)
            setPreviousLoadingBatch(0)
            setPciDssPreviousLoadingBatch(0)
            setPreviousSnapshotData(null)
            useDashboardStore.getState().setPciDssPreviousSnapshotData(null)
          } else {
            console.log('[useSnapshotAwareDashboard] Snapshot resolution or remount detected, preserving data')
          }
        }

        setLoading(true)

        // CRITICAL: Reset metrics to zero immediately when snapshot changes
        // This prevents stale data from previous snapshot showing during load
        // BUT: Only reset if this is a REAL snapshot change, not a remount
        if (isRealSnapshotChange) {
          const resetMetrics = {
            totalDevices: 0,
            activeAlerts: 0,
            complianceScore: 0,
            intentChecksPassed: 0,
            intentChecksFailed: 0,
            lastUpdated: null
          }
          setMetrics(resetMetrics)
          setGlobalMetrics(resetMetrics)
        } else {
          // On remount or snapshot resolution, restore from cache first, then global state
          if (newSnapshotHasCache) {
            console.log('[useSnapshotAwareDashboard] Restoring metrics from cache:', newSnapshotCache.metrics)
            setMetrics(newSnapshotCache.metrics)
            setGlobalMetrics(newSnapshotCache.metrics)
          } else {
            const globalMetrics = useDashboardStore.getState().metrics
            if (globalMetrics && globalMetrics.totalDevices > 0) {
              console.log('[useSnapshotAwareDashboard] Restoring metrics from global state:', globalMetrics)
              setMetrics(globalMetrics)
            }
          }
        }

        // DO NOT fetch comparison snapshot here - handle in separate useEffect
        // This useEffect is ONLY for latest snapshot

        // Initialize loading state based on selected framework
        if (frameworkForThisFetch === 'cis-v8') {
          const loadingControls: CISControl[] = [
            { id: '1', name: 'Inventory and Control of Enterprise Assets', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '2', name: 'Inventory and Control of Software Assets', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '3', name: 'Data Protection', score: 0, maxScore: 8, status: 'fail', loading: true },
            { id: '4', name: 'Secure Configuration of Enterprise Assets and Software', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '5', name: 'Account Management', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '6', name: 'Access Control Management', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '8', name: 'Audit Log Management', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '12', name: 'Network Infrastructure Management', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '13', name: 'Network Monitoring and Defence', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '17', name: 'Incident Response Management', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '18', name: 'Penetration Testing', score: 0, maxScore: 10, status: 'fail', loading: true }
          ]
          setCisControls(loadingControls)
          setLoadingBatch(1) // Show "Loading batch 1 of 4..." from start
        } else if (frameworkForThisFetch === 'pci-dss') {
          const loadingRequirements: PCIDSSRequirement[] = [
            { id: '1', name: 'Network Security Controls', score: 0, maxScore: 55, status: 'fail', loading: true },
            { id: '2', name: 'Secure Configurations', score: 0, maxScore: 35, status: 'fail', loading: true },
            { id: '6', name: 'Secure Systems and Software', score: 0, maxScore: 5, status: 'fail', loading: true },
            { id: '7', name: 'Access Restrictions', score: 0, maxScore: 5, status: 'fail', loading: true },
            { id: '8', name: 'User Authentication', score: 0, maxScore: 15, status: 'fail', loading: true },
            { id: '10', name: 'Logging and Monitoring', score: 0, maxScore: 15, status: 'fail', loading: true },
            { id: '11', name: 'Security Testing', score: 0, maxScore: 5, status: 'fail', loading: true },
            { id: '12', name: 'Information Security Policy', score: 0, maxScore: 20, status: 'fail', loading: true }
          ]
          setPciDssRequirements(loadingRequirements)
          setPciDssLoadingBatch(1) // Show "Loading batch 1 of 4..." from start
        } else if (frameworkForThisFetch === 'nist') {
          const loadingFunctions: NISTCSFFunction[] = [
            { id: 'GV', name: 'Govern', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: 'ID', name: 'Identify', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: 'PR', name: 'Protect', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: 'DE', name: 'Detect', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: 'RS', name: 'Respond', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: 'RC', name: 'Recover', score: 0, maxScore: 5, status: 'warning', loading: true }
          ]
          setNistFunctions(loadingFunctions)
          setNistLoadingBatch(1)
        } else if (frameworkForThisFetch === 'nis2') {
          const loadingArticles: NIS2Article[] = [
            { id: '21.2.B', name: 'Incident Handling', score: 0, maxScore: 60, status: 'warning', loading: true },
            { id: '21.2.C', name: 'Business Continuity', score: 0, maxScore: 25, status: 'warning', loading: true },
            { id: '21.2.D', name: 'Supply Chain Security', score: 0, maxScore: 20, status: 'warning', loading: true },
            { id: '21.2.E', name: 'Vulnerability Handling', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: '21.2.F', name: 'Risk Management Assessment', score: 0, maxScore: 30, status: 'warning', loading: true },
            { id: '21.2.H', name: 'Cryptography & Encryption', score: 0, maxScore: 10, status: 'warning', loading: true },
            { id: '21.2.I', name: 'Access Control & Asset Management', score: 0, maxScore: 35, status: 'warning', loading: true },
            { id: '27.2.F', name: 'Entity IP Ranges', score: 0, maxScore: 15, status: 'warning', loading: true }
          ]
          setNIS2Articles(loadingArticles)
          setNIS2LoadingBatch(1)
        }
        setLoading(false)  // Allow component to render (not show generic loading state)

        // Calculate metrics for selected snapshot
        // Route to appropriate calculator based on selected framework
        if (frameworkForThisFetch === 'cis-v8') {
          // CIS Controls calculation (existing logic)
          const currentMetrics = await calculateMetricsForSnapshot(
            selectedSnapshot,
            null,  // No comparison in this useEffect
            []
          )

          // Cancel & switch: abort if framework changed during calculation
          if (isStale()) {
            console.log(`[Dashboard] CIS fetch v${currentFetchVersion} aborted after calculation - newer fetch started`)
            return
          }

          const metricsData = {
            totalDevices: currentMetrics.totalDevices,
            activeAlerts: currentMetrics.activeAlerts,
            complianceScore: currentMetrics.complianceScore,
            intentChecksPassed: currentMetrics.intentChecksPassed,
            intentChecksFailed: currentMetrics.intentChecksFailed,
            lastUpdated: currentMetrics.lastUpdated
          }
          setMetrics(metricsData)
          setGlobalMetrics(metricsData)
          setDevices(currentMetrics.devices || [])
          setIntentCheckDetails(currentMetrics.intentCheckDetails || null)
          setCisControls((currentMetrics as any).cisControls || [])
          setDataAvailability((currentMetrics as any).dataAvailability || {
            completeData: true,
            availableDataSources: [],
            missingDataSources: [],
            confidenceLevel: 'high',
            affectedMetrics: [],
            overallImpact: 'All data available'
          })

          // Store in CIS cache
          const cisSnapshotData = {
            snapshotId: selectedSnapshot,
            devices: currentMetrics.devices || [],
            intentCheckDetails: currentMetrics.intentCheckDetails || null,
            cisControls: (currentMetrics as any).cisControls || [],
            dataAvailability: (currentMetrics as any).dataAvailability || {
              completeData: true,
              availableDataSources: [],
              missingDataSources: [],
              confidenceLevel: 'high',
              affectedMetrics: [],
              overallImpact: 'All data available'
            },
            metrics: metricsData,
            loadingBatch: 5,
            fetchedAt: Date.now()
          }
          setCurrentSnapshotData(cisSnapshotData)

          // Also store in multi-snapshot cache for instant switching
          useDashboardStore.getState().cacheSnapshot(cisSnapshotData)
        } else if (frameworkForThisFetch === 'pci-dss') {
          // PCI-DSS calculation
          // Get devices and intent checks first (shared with CIS)
          const pciDevices = await getDevices(selectedSnapshot, groupedApiCall, isDemoMode)

          // Cancel & switch: abort if framework changed
          if (isStale()) {
            console.log(`[Dashboard] PCI-DSS fetch v${currentFetchVersion} aborted after devices - newer fetch started`)
            return
          }

          const pciIntentChecks = await getIntentChecks(selectedSnapshot, pciDevices, groupedApiCall, isDemoMode)

          // Cancel & switch: abort if framework changed
          if (isStale()) {
            console.log(`[Dashboard] PCI-DSS fetch v${currentFetchVersion} aborted after intent checks - newer fetch started`)
            return
          }

          // Calculate PCI-DSS requirements progressively
          const pciRequirements = await calculatePCIDSSRequirementsProgressive(
            pciDevices,
            selectedSnapshot,
            groupedApiCall,
            undefined,  // No comparison
            undefined,
            (batchNum, partialReqs, totalBatches) => {
              setPciDssLoadingBatch(batchNum)
              setPciDssRequirements(currentReqs => {
                return currentReqs.map(req => {
                  const loadedReq = partialReqs.find(r => r.id === req.id)
                  return loadedReq || req
                })
              })
              const partialScore = calculateOverallPCIDSSScore(partialReqs)
              setMetrics(prev => ({...prev, complianceScore: partialScore}))
              updatePciDssCurrentSnapshotData({
                loadingBatch: batchNum,
                pciDssRequirements: partialReqs
              })
            }
          )

          // Cancel & switch: abort if framework changed during progressive calculation
          if (isStale()) {
            console.log(`[Dashboard] PCI-DSS fetch v${currentFetchVersion} aborted after requirements - newer fetch started`)
            return
          }

          const pciScore = calculateOverallPCIDSSScore(pciRequirements)
          const pciAlerts = calculateActiveAlerts(pciDevices, pciScore, pciIntentChecks?.failed || 0, pciRequirements, 'pci-dss')

          const pciMetricsData = {
            totalDevices: pciDevices.length,
            activeAlerts: pciAlerts,
            complianceScore: pciScore,
            intentChecksPassed: pciIntentChecks?.passed || 0,
            intentChecksFailed: pciIntentChecks?.failed || 0,
            lastUpdated: new Date()
          }

          setMetrics(pciMetricsData)
          setGlobalMetrics(pciMetricsData)
          setDevices(pciDevices)
          setPciDssRequirements(pciRequirements)
          setPciDssLoadingBatch(5)

          // Create intent check details object
          const pciIntentCheckDetails = pciIntentChecks ? {
            summary: [
              { name: 'Passed', value: pciIntentChecks.passed, color: 'green' },
              { name: 'Failed', value: pciIntentChecks.failed, color: 'red' },
              { name: 'Warning', value: pciIntentChecks.warning, color: 'orange' },
            ],
            categories: [],  // Categories extracted from reports in UI component
            totalChecks: pciIntentChecks.passed + pciIntentChecks.failed + pciIntentChecks.warning,
            issues: [],  // Issues extracted from reports in UI component
            reports: (pciIntentChecks as any).reports || []  // Pass through full reports data if available
          } : null
          setIntentCheckDetails(pciIntentCheckDetails)

          // Store in PCI-DSS cache
          const pciSnapshotData = {
            snapshotId: selectedSnapshot,
            devices: pciDevices,
            pciDssRequirements: pciRequirements,
            metrics: pciMetricsData,
            loadingBatch: 5,
            fetchedAt: Date.now(),
            intentCheckDetails: pciIntentCheckDetails
          }
          setPciDssCurrentSnapshotData(pciSnapshotData)

          // Also store in multi-snapshot cache for instant switching
          useDashboardStore.getState().cachePciDssSnapshot(pciSnapshotData)
        } else if (frameworkForThisFetch === 'nist') {
          // NIST CSF calculation
          const nistDevices = await getDevices(selectedSnapshot, groupedApiCall, isDemoMode)

          if (isStale()) {
            console.log(`[Dashboard] NIST fetch v${currentFetchVersion} aborted after devices - newer fetch started`)
            return
          }

          const nistIntentChecks = await getIntentChecks(selectedSnapshot, nistDevices, groupedApiCall, isDemoMode)

          if (isStale()) {
            console.log(`[Dashboard] NIST fetch v${currentFetchVersion} aborted after intent checks - newer fetch started`)
            return
          }

          const nistFuncs = await calculateNISTCSFProgressive(
            nistDevices,
            selectedSnapshot,
            nistIntentChecks?.passed || 0,
            nistIntentChecks?.failed || 0,
            groupedApiCall,
            undefined,  // No comparison
            undefined,
            (batchNum, partialFuncs, totalBatches) => {
              setNistLoadingBatch(batchNum)
              setNistFunctions(currentFuncs => {
                return currentFuncs.map(func => {
                  const loadedFunc = partialFuncs.find(f => f.id === func.id)
                  return loadedFunc || func
                })
              })
              const partialScore = calculateOverallNISTCSFScore(partialFuncs)
              setMetrics(prev => ({...prev, complianceScore: partialScore}))
              updateNistCurrentSnapshotData({
                loadingBatch: batchNum,
                nistFunctions: partialFuncs
              })
            }
          )

          if (isStale()) {
            console.log(`[Dashboard] NIST fetch v${currentFetchVersion} aborted after functions - newer fetch started`)
            return
          }

          const nistScore = calculateOverallNISTCSFScore(nistFuncs)
          const nistAlerts = calculateActiveAlerts(nistDevices, nistScore, nistIntentChecks?.failed || 0, nistFuncs, 'nist-csf')

          const nistMetricsData = {
            totalDevices: nistDevices.length,
            activeAlerts: nistAlerts,
            complianceScore: nistScore,
            intentChecksPassed: nistIntentChecks?.passed || 0,
            intentChecksFailed: nistIntentChecks?.failed || 0,
            lastUpdated: new Date()
          }

          setMetrics(nistMetricsData)
          setGlobalMetrics(nistMetricsData)
          setDevices(nistDevices)
          setNistFunctions(nistFuncs)
          setNistLoadingBatch(5)

          // Create intent check details object
          const nistIntentCheckDetails = nistIntentChecks ? {
            summary: [
              { name: 'Passed', value: nistIntentChecks.passed, color: 'green' },
              { name: 'Failed', value: nistIntentChecks.failed, color: 'red' },
              { name: 'Warning', value: nistIntentChecks.warning, color: 'orange' },
            ],
            categories: [],  // Categories extracted from reports in UI component
            totalChecks: nistIntentChecks.passed + nistIntentChecks.failed + nistIntentChecks.warning,
            issues: [],  // Issues extracted from reports in UI component
            reports: (nistIntentChecks as any).reports || []  // Pass through full reports data if available
          } : null
          setIntentCheckDetails(nistIntentCheckDetails)

          // Store in NIST cache
          const nistSnapshotData = {
            snapshotId: selectedSnapshot,
            devices: nistDevices,
            nistFunctions: nistFuncs,
            metrics: nistMetricsData,
            loadingBatch: 5,
            fetchedAt: Date.now(),
            intentCheckDetails: nistIntentCheckDetails
          }
          setNistCurrentSnapshotData(nistSnapshotData)

          // Also store in multi-snapshot cache for instant switching
          useDashboardStore.getState().cacheNistSnapshot(nistSnapshotData)
        } else if (frameworkForThisFetch === 'nis2') {
          // NIS2 calculation
          const nis2Devices = await getDevices(selectedSnapshot, groupedApiCall, isDemoMode)

          if (isStale()) {
            console.log(`[Dashboard] NIS2 fetch v${currentFetchVersion} aborted after devices - newer fetch started`)
            return
          }

          const nis2IntentChecks = await getIntentChecks(selectedSnapshot, nis2Devices, groupedApiCall, isDemoMode)

          if (isStale()) {
            console.log(`[Dashboard] NIS2 fetch v${currentFetchVersion} aborted after intent checks - newer fetch started`)
            return
          }

          const nis2Results = await calculateNIS2Progressive(
            nis2Devices,
            selectedSnapshot,
            nis2IntentChecks?.passed || 0,
            nis2IntentChecks?.failed || 0,
            groupedApiCall,
            undefined,  // No comparison
            undefined,
            (batchNum, partialArticles, totalBatches) => {
              setNIS2LoadingBatch(batchNum)
              setNIS2Articles(currentArticles => {
                return currentArticles.map(article => {
                  const loadedArticle = partialArticles.find(a => a.id === article.id)
                  return loadedArticle || article
                })
              })
              const partialScore = calculateOverallNIS2Score(partialArticles)
              setMetrics(prev => ({ ...prev, complianceScore: partialScore }))
              setGlobalMetrics({ ...metrics, complianceScore: partialScore })
            }
          )

          if (isStale()) {
            console.log(`[Dashboard] NIS2 fetch v${currentFetchVersion} aborted after calculation - newer fetch started`)
            return
          }

          setNIS2Articles(nis2Results)
          setDevices(nis2Devices)
          setNIS2LoadingBatch(5)

          const nis2Score = calculateOverallNIS2Score(nis2Results)
          const nis2MetricsData: DashboardMetrics = {
            totalDevices: nis2Devices.length,
            activeAlerts: 0,
            complianceScore: nis2Score,
            intentChecksPassed: nis2IntentChecks?.passed || 0,
            intentChecksFailed: nis2IntentChecks?.failed || 0,
            lastUpdated: new Date()
          }
          setMetrics(nis2MetricsData)
          setGlobalMetrics(nis2MetricsData)

          const nis2IntentCheckDetails = nis2IntentChecks ? {
            summary: [
              { name: 'Passed', value: nis2IntentChecks.passed, color: 'green' },
              { name: 'Failed', value: nis2IntentChecks.failed, color: 'red' },
              { name: 'Warning', value: nis2IntentChecks.warning, color: 'orange' },
            ],
            categories: [],
            totalChecks: nis2IntentChecks.passed + nis2IntentChecks.failed + nis2IntentChecks.warning,
            issues: [],
            reports: (nis2IntentChecks as any).reports || []
          } : null
          setIntentCheckDetails(nis2IntentCheckDetails)

          // Store in NIS2 cache
          const nis2SnapshotData = {
            snapshotId: selectedSnapshot,
            devices: nis2Devices,
            nis2Articles: nis2Results,
            metrics: nis2MetricsData,
            loadingBatch: 5,
            fetchedAt: Date.now(),
            intentCheckDetails: nis2IntentCheckDetails
          }
          setNIS2CurrentSnapshotData(nis2SnapshotData)
          useDashboardStore.getState().cacheNIS2Snapshot(nis2SnapshotData)
        }
      } catch (error) {
        console.error('Failed to fetch snapshot data:', error)
        // Clear appropriate cache on error so retry is possible
        // Use captured framework to clear the correct cache
        if (frameworkForThisFetch === 'cis-v8') {
          setCurrentSnapshotData(null)
        } else if (frameworkForThisFetch === 'pci-dss') {
          setPciDssCurrentSnapshotData(null)
        } else if (frameworkForThisFetch === 'nis2') {
          setNIS2CurrentSnapshotData(null)
        } else {
          setNistCurrentSnapshotData(null)
        }
      } finally {
        setLoading(false)
        // Reset appropriate fetching flag using captured framework
        // This ensures we reset the flag for the framework that started this fetch
        if (frameworkForThisFetch === 'cis-v8') {
          setIsFetchingCurrent(false)
        } else if (frameworkForThisFetch === 'pci-dss') {
          setIsFetchingPciDssCurrent(false)
        } else if (frameworkForThisFetch === 'nis2') {
          setIsFetchingNIS2Current(false)
        } else {
          setIsFetchingNistCurrent(false)
        }
      }
    }

    if (selectedSnapshot && snapshots.length > 0) {
      fetchSnapshotData()
    }

    // Update refs for remount detection
    previousSnapshotRef.current = selectedSnapshot
    isInitialMount.current = false

    // Cache data checked inside with early return, not a dependency to prevent infinite loop
    // snapshots is NOT a dependency - we only check its length inside
    // selectedFramework IS a dependency - framework change should trigger re-fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSnapshot, selectedFramework])

  // Track previous comparison group for abort on switch
  const previousComparisonGroupRef = useRef<string | null>(null)

  // Separate useEffect for comparison snapshot loading (doesn't re-fetch latest)
  useEffect(() => {
    // Create group ID for comparison fetch
    const comparisonFetchGroup = comparisonSnapshotId
      ? `comparison-${selectedFramework}-${comparisonSnapshotId}`
      : null

    // Abort any pending comparison requests from previous group
    if (previousComparisonGroupRef.current && previousComparisonGroupRef.current !== comparisonFetchGroup) {
      console.log(`[Dashboard] Aborting previous comparison fetch group: ${previousComparisonGroupRef.current}`)
      rateLimiter.abortGroup(previousComparisonGroupRef.current)
    }
    previousComparisonGroupRef.current = comparisonFetchGroup

    // Create grouped API call for comparison (if we have a groupId)
    const comparisonApiCall = comparisonFetchGroup
      ? createGroupedApiCall(comparisonFetchGroup)
      : apiCall

    const fetchComparisonSnapshot = async () => {
      // If no comparison selected, clear everything
      if (!comparisonSnapshotId) {
        if (previousSnapshotData !== null || useDashboardStore.getState().pciDssPreviousSnapshotData !== null) {
          setPreviousMetrics(null)
          setPreviousCisControls([])
          setPreviousPciDssRequirements([])
          setPreviousSnapshot(null)
          setPreviousLoadingBatch(0)
          setPciDssPreviousLoadingBatch(0)
          setPreviousDevices([])
          setPreviousSnapshotData(null)
          useDashboardStore.getState().setPciDssPreviousSnapshotData(null)
        }
        return
      }

      // NEW: Check multi-snapshot cache for INSTANT comparison restore
      const comparisonMultiCache = selectedFramework === 'cis-v8'
        ? useDashboardStore.getState().snapshotCache
        : selectedFramework === 'pci-dss'
          ? useDashboardStore.getState().pciDssSnapshotCache
          : selectedFramework === 'nis2'
            ? useDashboardStore.getState().nis2SnapshotCache
            : useDashboardStore.getState().nistSnapshotCache

      const cachedComparison = comparisonMultiCache[comparisonSnapshotId]

      if (cachedComparison && cachedComparison.loadingBatch >= 5) {
        console.log(`[Dashboard] INSTANT comparison from multi-cache: ${comparisonSnapshotId} (${selectedFramework})`)

        // Restore as previous snapshot data
        if (selectedFramework === 'cis-v8') {
          const cisCache = cachedComparison as import('@/stores/dashboard-store').SnapshotData
          setPreviousSnapshotData(cisCache)
          setPreviousCisControls(cisCache.cisControls)
          setPreviousDataAvailability(cisCache.dataAvailability)
          setPreviousLoadingBatch(5)
          if (cisCache.intentCheckDetails) {
            setPreviousIntentCheckDetails(cisCache.intentCheckDetails)
          }
        } else if (selectedFramework === 'pci-dss') {
          const pciCache = cachedComparison as import('@/stores/dashboard-store').PCIDSSSnapshotData
          useDashboardStore.getState().setPciDssPreviousSnapshotData(pciCache)
          setPreviousPciDssRequirements(pciCache.pciDssRequirements)
          setPciDssPreviousLoadingBatch(5)
          if (pciCache.intentCheckDetails) {
            setPreviousIntentCheckDetails(pciCache.intentCheckDetails)
          }
        } else if (selectedFramework === 'nis2') {
          const nis2Cache = cachedComparison as import('@/stores/dashboard-store').NIS2SnapshotData
          useDashboardStore.getState().setNIS2PreviousSnapshotData(nis2Cache)
          setPreviousNIS2Articles(nis2Cache.nis2Articles)
          setNIS2PreviousLoadingBatch(5)
          if (nis2Cache.intentCheckDetails) {
            setPreviousIntentCheckDetails(nis2Cache.intentCheckDetails)
          }
        } else {
          const nistCache = cachedComparison as import('@/stores/dashboard-store').NISTSnapshotData
          useDashboardStore.getState().setNistPreviousSnapshotData(nistCache)
          setPreviousNistFunctions(nistCache.nistFunctions)
          setNistPreviousLoadingBatch(5)
          if (nistCache.intentCheckDetails) {
            setPreviousIntentCheckDetails(nistCache.intentCheckDetails)
          }
        }

        setPreviousMetrics(cachedComparison.metrics)
        setPreviousDevices(cachedComparison.devices)

        // Set the snapshot object
        const prevSnapshot = snapshots.find(s => s.id === comparisonSnapshotId)
        if (prevSnapshot) {
          setPreviousSnapshot(prevSnapshot)
        }

        // Recalculate deltas with cached comparison data
        // This updates current controls to show delta indicators
        if (selectedFramework === 'cis-v8') {
          const cachedCisComparison = cachedComparison as import('@/stores/dashboard-store').SnapshotData
          // Get CURRENT snapshot from cache to avoid stale local state (React batching issue)
          const currentSnapshotCache = comparisonMultiCache[selectedSnapshot] as import('@/stores/dashboard-store').SnapshotData
          if (!currentSnapshotCache) {
            console.log('[Dashboard] Current snapshot not in cache, skipping delta recalc')
            return
          }
          const currentMetricsExtracted = extractMetricsFromControls(
            currentSnapshotCache.cisControls,
            currentSnapshotCache.devices.length,
            currentSnapshotCache.intentCheckDetails?.summary?.find((s: any) => s.name === 'Passed')?.value || 0,
            currentSnapshotCache.intentCheckDetails?.summary?.find((s: any) => s.name === 'Failed')?.value || 0
          )
          const previousMetricsExtracted = extractMetricsFromControls(
            cachedCisComparison.cisControls,
            cachedCisComparison.devices.length,
            cachedCisComparison.intentCheckDetails?.summary?.find((s: any) => s.name === 'Passed')?.value || 0,
            cachedCisComparison.intentCheckDetails?.summary?.find((s: any) => s.name === 'Failed')?.value || 0
          )
          const recalculatedCurrentControls = recalculateControlsWithMetrics(
            currentMetricsExtracted,
            previousMetricsExtracted,
            currentSnapshotCache.devices
          )
          const enrichedCurrentControls = enrichControlsWithDeltas(recalculatedCurrentControls, cachedCisComparison.cisControls)
          const finalComplianceScore = calculateOverallCISScore(enrichedCurrentControls)

          // Use cached metrics to avoid stale local state (React batching issue)
          const updatedMetrics = { ...currentSnapshotCache.metrics, complianceScore: finalComplianceScore }
          setMetrics(updatedMetrics)
          setGlobalMetrics(updatedMetrics)
          setCisControls(enrichedCurrentControls)
          updateCurrentSnapshotData({ cisControls: enrichedCurrentControls, metrics: updatedMetrics })
        } else if (selectedFramework === 'pci-dss') {
          const cachedPciComparison = cachedComparison as import('@/stores/dashboard-store').PCIDSSSnapshotData
          // Get CURRENT snapshot from PCI-DSS cache to avoid stale local state (React batching issue)
          const currentPciSnapshotCache = comparisonMultiCache[selectedSnapshot] as import('@/stores/dashboard-store').PCIDSSSnapshotData
          if (!currentPciSnapshotCache) {
            console.log('[Dashboard] Current PCI-DSS snapshot not in cache, skipping delta recalc')
            return
          }
          const currentPciMetricsExtracted = extractMetricsFromRequirements(
            currentPciSnapshotCache.pciDssRequirements,
            currentPciSnapshotCache.devices.length,
            0
          )
          const previousPciMetricsExtracted = extractMetricsFromRequirements(
            cachedPciComparison.pciDssRequirements,
            cachedPciComparison.devices.length,
            0
          )
          const recalculatedCurrentRequirements = recalculatePCIDSSWithMetrics(
            currentPciMetricsExtracted,
            previousPciMetricsExtracted,
            currentPciSnapshotCache.devices
          )
          const finalPciScore = calculateOverallPCIDSSScore(recalculatedCurrentRequirements)

          // Use cached metrics to avoid stale local state (React batching issue)
          const updatedPciMetrics = { ...currentPciSnapshotCache.metrics, complianceScore: finalPciScore }
          setMetrics(updatedPciMetrics)
          setGlobalMetrics(updatedPciMetrics)
          setPciDssRequirements(recalculatedCurrentRequirements)
          updatePciDssCurrentSnapshotData({ pciDssRequirements: recalculatedCurrentRequirements, metrics: updatedPciMetrics })
        }

        return  // INSTANT - no fetch needed
      }

      // Check if data is already cached and matches the comparison snapshot
      // Route to appropriate cache based on framework
      const pciDssPrevCache = useDashboardStore.getState().pciDssPreviousSnapshotData
      const nistPrevCache = useDashboardStore.getState().nistPreviousSnapshotData
      const nis2PrevCache = useDashboardStore.getState().nis2PreviousSnapshotData
      const prevCacheData = selectedFramework === 'cis-v8'
        ? previousSnapshotData
        : selectedFramework === 'pci-dss'
          ? pciDssPrevCache
          : selectedFramework === 'nis2'
            ? nis2PrevCache
            : nistPrevCache

      if (prevCacheData && prevCacheData.snapshotId === comparisonSnapshotId) {
        // Restore state from cache
        setPreviousMetrics(prevCacheData.metrics)
        setPreviousDevices(prevCacheData.devices)

        if (selectedFramework === 'cis-v8' && 'cisControls' in prevCacheData) {
          setPreviousIntentCheckDetails(prevCacheData.intentCheckDetails)
          setPreviousCisControls(prevCacheData.cisControls)
          setPreviousDataAvailability(prevCacheData.dataAvailability)
          setPreviousLoadingBatch(prevCacheData.loadingBatch)
        } else if (selectedFramework === 'pci-dss' && 'pciDssRequirements' in prevCacheData) {
          setPreviousPciDssRequirements(prevCacheData.pciDssRequirements)
          setPciDssPreviousLoadingBatch(prevCacheData.loadingBatch)
          if (prevCacheData.intentCheckDetails) {
            setPreviousIntentCheckDetails(prevCacheData.intentCheckDetails)
          }
        } else if (selectedFramework === 'nis2' && 'nis2Articles' in prevCacheData) {
          setPreviousNIS2Articles((prevCacheData as import('@/stores/dashboard-store').NIS2SnapshotData).nis2Articles)
          setNIS2PreviousLoadingBatch(prevCacheData.loadingBatch)
          if (prevCacheData.intentCheckDetails) {
            setPreviousIntentCheckDetails(prevCacheData.intentCheckDetails)
          }
        } else if (selectedFramework === 'nist' && 'nistFunctions' in prevCacheData) {
          setPreviousNistFunctions(prevCacheData.nistFunctions)
          setNistPreviousLoadingBatch(prevCacheData.loadingBatch)
          if (prevCacheData.intentCheckDetails) {
            setPreviousIntentCheckDetails(prevCacheData.intentCheckDetails)
          }
        }

        // Set the snapshot object
        const prevSnapshot = snapshots.find(s => s.id === comparisonSnapshotId)
        if (prevSnapshot) {
          setPreviousSnapshot(prevSnapshot)
        }
        return
      }

      // If comparison snapshot CHANGED (not just set), clear old data first
      // IMPORTANT: Do this BEFORE guard check to ensure state is reset
      const prevCacheChanged = (previousSnapshotData && previousSnapshotData.snapshotId !== comparisonSnapshotId) ||
        (pciDssPrevCache && pciDssPrevCache.snapshotId !== comparisonSnapshotId) ||
        (nis2PrevCache && nis2PrevCache.snapshotId !== comparisonSnapshotId)

      if (prevCacheChanged) {
        // CRITICAL: Reset metrics to zero immediately (like current snapshot logic at 231-242)
        const resetPreviousMetrics = {
          totalDevices: 0,
          activeAlerts: 0,
          complianceScore: 0,
          intentChecksPassed: 0,
          intentChecksFailed: 0,
          lastUpdated: null
        }
        setPreviousMetrics(resetPreviousMetrics)  // Set to 0, not null
        setPreviousCisControls([])
        setPreviousPciDssRequirements([])
        setPreviousNIS2Articles([])
        setPreviousSnapshot(null)
        setPreviousLoadingBatch(1)  // Set to 1 immediately to show loading animation
        setPciDssPreviousLoadingBatch(1)
        setNistPreviousLoadingBatch(1)
        setNIS2PreviousLoadingBatch(1)
        setPreviousDevices([])
        setPreviousSnapshotData(null)
        useDashboardStore.getState().setPciDssPreviousSnapshotData(null)
        useDashboardStore.getState().setNistPreviousSnapshotData(null)
        useDashboardStore.getState().setNIS2PreviousSnapshotData(null)

        // Reset fetching flag when comparison changes to allow immediate re-fetch
        setIsFetchingPrevious(false)
      }

      // Guards to prevent duplicate fetching and infinite loops
      // NOTE: After clearing above, this now only prevents duplicate of SAME snapshot
      if (isFetchingPrevious) {
        return
      }

      // Check if latest finished loading (framework-aware)
      const currentLoadingBatch = selectedFramework === 'cis-v8'
        ? loadingBatch
        : selectedFramework === 'pci-dss'
          ? pciDssLoadingBatch
          : selectedFramework === 'nis2'
            ? nis2LoadingBatch
            : nistLoadingBatch
      if (currentLoadingBatch < 5) {
        return
      }

      if (snapshots.length === 0) return

      const prevSnapshot = snapshots.find(s => s.id === comparisonSnapshotId && s.state === 'loaded')
      if (!prevSnapshot) return

      setIsFetchingPrevious(true)

      try {
        setPreviousSnapshot(prevSnapshot)  // Set early so UI shows loading card

        // Get devices and intent checks for previous snapshot (shared between frameworks)
        const prevDevices = await getDevices(prevSnapshot.id, comparisonApiCall, isDemoMode)
        const prevIntentChecks = await getIntentChecks(prevSnapshot.id, prevDevices, comparisonApiCall, isDemoMode)

        // Calculate active alerts for previous snapshot
        // Note: prevActiveAlerts will be calculated after framework controls are loaded
        const prevComplianceScore = 0 // Will be calculated from controls/requirements

        let finalPrevScore = 0
        let finalPrevActiveAlerts = 0 // Will be set by framework-specific calculations

        if (selectedFramework === 'cis-v8') {
          // CIS Controls - Initialize previous loading controls
          const prevLoadingControls: CISControl[] = [
            { id: '1', name: 'Inventory and Control of Enterprise Assets', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '2', name: 'Inventory and Control of Software Assets', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '3', name: 'Data Protection', score: 0, maxScore: 8, status: 'fail', loading: true },
            { id: '4', name: 'Secure Configuration of Enterprise Assets and Software', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '5', name: 'Account Management', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '6', name: 'Access Control Management', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '8', name: 'Audit Log Management', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '12', name: 'Network Infrastructure Management', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '13', name: 'Network Monitoring and Defence', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '17', name: 'Incident Response Management', score: 0, maxScore: 10, status: 'fail', loading: true },
            { id: '18', name: 'Penetration Testing', score: 0, maxScore: 10, status: 'fail', loading: true }
          ]
          setPreviousCisControls(prevLoadingControls)
          setPreviousLoadingBatch(1)

          // Call progressive loader directly with PREVIOUS callback
          const prevControls = await calculateCISControlsProgressive(
            prevDevices,
            prevSnapshot.id,
            prevIntentChecks?.passed || 0,
            prevIntentChecks?.failed || 0,
            comparisonApiCall,
            null,  // No double-comparison
            undefined,
            (batchNum, controls, total) => {
              setPreviousLoadingBatch(batchNum)

              // Update PREVIOUS controls progressively
              setPreviousCisControls(currentPrev => {
                return currentPrev.map(c => {
                  const loaded = controls.find(ctrl => ctrl.id === c.id)
                  return loaded || c
                })
              })

              // Update previous metrics score
              const prevScore = calculateOverallCISScore(controls)
              setPreviousMetrics(prev => prev ? {...prev, complianceScore: prevScore} : null)

              // Update global cache with progressive data
              updatePreviousSnapshotData({
                loadingBatch: batchNum,
                cisControls: controls
              })
            }
          )

          // Calculate final compliance score
          finalPrevScore = calculateOverallCISScore(prevControls)

          // Calculate active alerts with CIS controls
          finalPrevActiveAlerts = calculateActiveAlerts(
            prevDevices,
            finalPrevScore,
            prevIntentChecks?.failed || 0,
            prevControls,
            'cis-v8'
          )

          // Set final CIS state
          setPreviousCisControls(prevControls)
          setPreviousLoadingBatch(5)

          // Store in CIS cache
          const cisPreviousSnapshotData: import('@/stores/dashboard-store').SnapshotData = {
            snapshotId: comparisonSnapshotId,
            devices: prevDevices,
            intentCheckDetails: prevIntentChecks ? {
              summary: [
                { name: 'Passed', value: prevIntentChecks.passed, color: 'green' },
                { name: 'Failed', value: prevIntentChecks.failed, color: 'red' },
                { name: 'Warning', value: prevIntentChecks.warning, color: 'orange' },
              ],
              reports: (prevIntentChecks as any).reports || []
            } : null,
            cisControls: prevControls,
            dataAvailability: {
              completeData: true,
              availableDataSources: [],
              missingDataSources: [],
              confidenceLevel: 'high' as const,
              affectedMetrics: [],
              overallImpact: 'All data available'
            },
            metrics: {
              totalDevices: prevDevices.length,
              activeAlerts: finalPrevActiveAlerts,
              complianceScore: finalPrevScore,
              intentChecksPassed: prevIntentChecks?.passed || 0,
              intentChecksFailed: prevIntentChecks?.failed || 0,
              lastUpdated: new Date()
            },
            loadingBatch: 5,
            fetchedAt: Date.now()
          }
          setPreviousSnapshotData(cisPreviousSnapshotData)

          // Also store in multi-snapshot cache for instant switching
          useDashboardStore.getState().cacheSnapshot(cisPreviousSnapshotData)

          // Recalculate current controls with delta context (CIS-specific)
          // Get current snapshot from cache to avoid stale local state (React batching issue)
          const currentSnapshotCacheForFetch = useDashboardStore.getState().snapshotCache[selectedSnapshot] as import('@/stores/dashboard-store').SnapshotData
          if (!currentSnapshotCacheForFetch) {
            console.log('[Dashboard] Current snapshot not in cache during comparison fetch, skipping delta recalc')
            return
          }
          const currentMetricsExtracted = extractMetricsFromControls(
            currentSnapshotCacheForFetch.cisControls,
            currentSnapshotCacheForFetch.devices.length,
            currentSnapshotCacheForFetch.intentCheckDetails?.summary?.find((s: any) => s.name === 'Passed')?.value || 0,
            currentSnapshotCacheForFetch.intentCheckDetails?.summary?.find((s: any) => s.name === 'Failed')?.value || 0
          )
          const previousMetricsExtracted = extractMetricsFromControls(
            prevControls,
            prevDevices.length,
            prevIntentChecks?.passed || 0,
            prevIntentChecks?.failed || 0
          )
          const recalculatedCurrentControls = recalculateControlsWithMetrics(
            currentMetricsExtracted,
            previousMetricsExtracted,
            currentSnapshotCacheForFetch.devices
          )
          const enrichedCurrentControls = enrichControlsWithDeltas(recalculatedCurrentControls, prevControls)
          const finalComplianceScore = calculateOverallCISScore(enrichedCurrentControls)

          // Use cached metrics to avoid stale local state (React batching issue)
          const updatedMetrics = { ...currentSnapshotCacheForFetch.metrics, complianceScore: finalComplianceScore }
          setMetrics(updatedMetrics)
          setGlobalMetrics(updatedMetrics)
          setCisControls(enrichedCurrentControls)
          updateCurrentSnapshotData({ cisControls: enrichedCurrentControls, metrics: updatedMetrics })

        } else if (selectedFramework === 'pci-dss') {
          // PCI-DSS - Initialize previous loading requirements
          const prevLoadingRequirements: PCIDSSRequirement[] = [
            { id: '1', name: 'Network Security Controls', score: 0, maxScore: 55, status: 'fail', loading: true },
            { id: '2', name: 'Secure Configurations', score: 0, maxScore: 35, status: 'fail', loading: true },
            { id: '6', name: 'Secure Systems and Software', score: 0, maxScore: 5, status: 'fail', loading: true },
            { id: '7', name: 'Access Restrictions', score: 0, maxScore: 5, status: 'fail', loading: true },
            { id: '8', name: 'User Authentication', score: 0, maxScore: 15, status: 'fail', loading: true },
            { id: '10', name: 'Logging and Monitoring', score: 0, maxScore: 15, status: 'fail', loading: true },
            { id: '11', name: 'Security Testing', score: 0, maxScore: 5, status: 'fail', loading: true },
            { id: '12', name: 'Information Security Policy', score: 0, maxScore: 20, status: 'fail', loading: true }
          ]
          setPreviousPciDssRequirements(prevLoadingRequirements)
          setPciDssPreviousLoadingBatch(1)

          // Call PCI-DSS progressive loader
          const prevPciRequirements = await calculatePCIDSSRequirementsProgressive(
            prevDevices,
            prevSnapshot.id,
            comparisonApiCall,
            undefined,  // No double-comparison
            undefined,
            (batchNum, requirements, total) => {
              setPciDssPreviousLoadingBatch(batchNum)

              // Update PREVIOUS requirements progressively
              setPreviousPciDssRequirements(currentPrev => {
                return currentPrev.map(r => {
                  const loaded = requirements.find(req => req.id === r.id)
                  return loaded || r
                })
              })

              // Update previous metrics score
              const prevScore = calculateOverallPCIDSSScore(requirements)
              setPreviousMetrics(prev => prev ? {...prev, complianceScore: prevScore} : null)

              // Update global cache with progressive data
              updatePciDssPreviousSnapshotData({
                loadingBatch: batchNum,
                pciDssRequirements: requirements
              })
            }
          )

          // Calculate final compliance score
          finalPrevScore = calculateOverallPCIDSSScore(prevPciRequirements)

          // Calculate active alerts with PCI-DSS requirements
          finalPrevActiveAlerts = calculateActiveAlerts(
            prevDevices,
            finalPrevScore,
            prevIntentChecks?.failed || 0,
            prevPciRequirements,
            'pci-dss'
          )

          // Set final PCI-DSS state
          setPreviousPciDssRequirements(prevPciRequirements)
          setPciDssPreviousLoadingBatch(5)

          // Store in PCI-DSS cache
          const pciPreviousSnapshotData = {
            snapshotId: comparisonSnapshotId,
            devices: prevDevices,
            intentCheckDetails: prevIntentChecks ? {
              summary: [
                { name: 'Passed', value: prevIntentChecks.passed, color: 'green' },
                { name: 'Failed', value: prevIntentChecks.failed, color: 'red' },
                { name: 'Warning', value: prevIntentChecks.warning, color: 'orange' },
              ],
              categories: [],
              totalChecks: prevIntentChecks.passed + prevIntentChecks.failed + prevIntentChecks.warning,
              issues: [],
              reports: (prevIntentChecks as any).reports || []
            } : null,
            pciDssRequirements: prevPciRequirements,
            metrics: {
              totalDevices: prevDevices.length,
              activeAlerts: finalPrevActiveAlerts,
              complianceScore: finalPrevScore,
              intentChecksPassed: prevIntentChecks?.passed || 0,
              intentChecksFailed: prevIntentChecks?.failed || 0,
              lastUpdated: new Date()
            },
            loadingBatch: 5,
            fetchedAt: Date.now()
          }
          useDashboardStore.getState().setPciDssPreviousSnapshotData(pciPreviousSnapshotData)

          // Also store in multi-snapshot cache for instant switching
          useDashboardStore.getState().cachePciDssSnapshot(pciPreviousSnapshotData)

          // Recalculate current requirements with delta context (PCI-DSS-specific)
          // Get current snapshot from PCI-DSS cache to avoid stale local state (React batching issue)
          const currentPciSnapshotCacheForFetch = useDashboardStore.getState().pciDssSnapshotCache[selectedSnapshot] as import('@/stores/dashboard-store').PCIDSSSnapshotData
          if (!currentPciSnapshotCacheForFetch) {
            console.log('[Dashboard] Current PCI-DSS snapshot not in cache during comparison fetch, skipping delta recalc')
            return
          }
          const currentPciMetricsExtracted = extractMetricsFromRequirements(
            currentPciSnapshotCacheForFetch.pciDssRequirements,
            currentPciSnapshotCacheForFetch.devices.length,
            0  // totalSites - we don't track this separately for PCI-DSS
          )
          const previousPciMetricsExtracted = extractMetricsFromRequirements(
            prevPciRequirements,
            prevDevices.length,
            0
          )
          const recalculatedCurrentRequirements = recalculatePCIDSSWithMetrics(
            currentPciMetricsExtracted,
            previousPciMetricsExtracted,
            currentPciSnapshotCacheForFetch.devices
          )
          const finalPciScore = calculateOverallPCIDSSScore(recalculatedCurrentRequirements)

          // Use cached metrics to avoid stale local state (React batching issue)
          const updatedPciMetrics = { ...currentPciSnapshotCacheForFetch.metrics, complianceScore: finalPciScore }
          setMetrics(updatedPciMetrics)
          setGlobalMetrics(updatedPciMetrics)
          setPciDssRequirements(recalculatedCurrentRequirements)
          updatePciDssCurrentSnapshotData({ pciDssRequirements: recalculatedCurrentRequirements, metrics: updatedPciMetrics })
        } else if (selectedFramework === 'nist') {
          // NIST CSF comparison snapshot calculation
          console.log(`[Dashboard] Fetching NIST comparison snapshot: ${comparisonSnapshotId}`)

          // Initialize loading functions
          const prevLoadingFunctions: NISTCSFFunction[] = [
            { id: 'GV', name: 'Govern', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: 'ID', name: 'Identify', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: 'PR', name: 'Protect', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: 'DE', name: 'Detect', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: 'RS', name: 'Respond', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: 'RC', name: 'Recover', score: 0, maxScore: 5, status: 'warning', loading: true }
          ]
          setPreviousNistFunctions(prevLoadingFunctions)
          setNistPreviousLoadingBatch(1)

          // Calculate with progressive loading
          const prevNistFuncs = await calculateNISTCSFProgressive(
            prevDevices,
            prevSnapshot.id,
            prevIntentChecks?.passed || 0,
            prevIntentChecks?.failed || 0,
            comparisonApiCall,
            null,  // No double-comparison
            undefined,
            (batchNum, functions, total) => {
              setNistPreviousLoadingBatch(batchNum)
              setPreviousNistFunctions(current => {
                return current.map(f => {
                  const loaded = functions.find(func => func.id === f.id)
                  return loaded || f
                })
              })
              // Update cache with progressive data
              updateNistPreviousSnapshotData({
                loadingBatch: batchNum,
                nistFunctions: functions
              })
            }
          )

          // Calculate metrics
          finalPrevScore = calculateOverallNISTCSFScore(prevNistFuncs)

          // Calculate active alerts with NIST functions
          finalPrevActiveAlerts = calculateActiveAlerts(
            prevDevices,
            finalPrevScore,
            prevIntentChecks?.failed || 0,
            prevNistFuncs,
            'nist-csf'
          )

          // Set final NIST state
          setPreviousNistFunctions(prevNistFuncs)
          setNistPreviousLoadingBatch(5)

          // Store in NIST cache
          const nistPreviousSnapshotData = {
            snapshotId: comparisonSnapshotId,
            devices: prevDevices,
            intentCheckDetails: prevIntentChecks ? {
              summary: [
                { name: 'Passed', value: prevIntentChecks.passed, color: 'green' },
                { name: 'Failed', value: prevIntentChecks.failed, color: 'red' },
                { name: 'Warning', value: prevIntentChecks.warning, color: 'orange' },
              ],
              categories: [],
              totalChecks: prevIntentChecks.passed + prevIntentChecks.failed + prevIntentChecks.warning,
              issues: [],
              reports: (prevIntentChecks as any).reports || []
            } : null,
            nistFunctions: prevNistFuncs,
            metrics: {
              totalDevices: prevDevices.length,
              activeAlerts: finalPrevActiveAlerts,
              complianceScore: finalPrevScore,
              intentChecksPassed: prevIntentChecks?.passed || 0,
              intentChecksFailed: prevIntentChecks?.failed || 0,
              lastUpdated: new Date()
            },
            loadingBatch: 5,
            fetchedAt: Date.now()
          }
          useDashboardStore.getState().setNistPreviousSnapshotData(nistPreviousSnapshotData)

          // Also store in multi-snapshot cache for instant switching
          useDashboardStore.getState().cacheNistSnapshot(nistPreviousSnapshotData)

          console.log(`[Dashboard] NIST comparison snapshot loaded: ${comparisonSnapshotId}`)
        } else if (selectedFramework === 'nis2') {
          // NIS2 comparison snapshot calculation
          console.log(`[Dashboard] Fetching NIS2 comparison snapshot: ${comparisonSnapshotId}`)

          // Initialize loading articles
          const prevLoadingArticles: NIS2Article[] = [
            { id: '21.2.B', name: 'Incident Handling', score: 0, maxScore: 60, status: 'warning', loading: true },
            { id: '21.2.C', name: 'Business Continuity', score: 0, maxScore: 25, status: 'warning', loading: true },
            { id: '21.2.D', name: 'Supply Chain Security', score: 0, maxScore: 20, status: 'warning', loading: true },
            { id: '21.2.E', name: 'Vulnerability Handling', score: 0, maxScore: 5, status: 'warning', loading: true },
            { id: '21.2.F', name: 'Risk Management Assessment', score: 0, maxScore: 30, status: 'warning', loading: true },
            { id: '21.2.H', name: 'Cryptography & Encryption', score: 0, maxScore: 10, status: 'warning', loading: true },
            { id: '21.2.I', name: 'Access Control & Asset Management', score: 0, maxScore: 35, status: 'warning', loading: true },
            { id: '27.2.F', name: 'Entity IP Ranges', score: 0, maxScore: 15, status: 'warning', loading: true }
          ]
          setPreviousNIS2Articles(prevLoadingArticles)
          setNIS2PreviousLoadingBatch(1)

          // Calculate with progressive loading
          const prevNIS2Articles = await calculateNIS2Progressive(
            prevDevices,
            prevSnapshot.id,
            prevIntentChecks?.passed || 0,
            prevIntentChecks?.failed || 0,
            comparisonApiCall,
            null,  // No double-comparison
            undefined,
            (batchNum, articles, total) => {
              setNIS2PreviousLoadingBatch(batchNum)
              setPreviousNIS2Articles(current => {
                return current.map(a => {
                  const loaded = articles.find(art => art.id === a.id)
                  return loaded || a
                })
              })
              // Update previous metrics score
              const prevScore = calculateOverallNIS2Score(articles)
              setPreviousMetrics(prev => prev ? {...prev, complianceScore: prevScore} : null)
            }
          )

          // Calculate metrics
          finalPrevScore = calculateOverallNIS2Score(prevNIS2Articles)

          finalPrevActiveAlerts = 0  // NIS2 does not use calculateActiveAlerts

          // Set final NIS2 state
          setPreviousNIS2Articles(prevNIS2Articles)
          setNIS2PreviousLoadingBatch(5)

          // Store in NIS2 cache
          const nis2PreviousSnapshotData = {
            snapshotId: comparisonSnapshotId,
            devices: prevDevices,
            intentCheckDetails: prevIntentChecks ? {
              summary: [
                { name: 'Passed', value: prevIntentChecks.passed, color: 'green' },
                { name: 'Failed', value: prevIntentChecks.failed, color: 'red' },
                { name: 'Warning', value: prevIntentChecks.warning, color: 'orange' },
              ],
              categories: [],
              totalChecks: prevIntentChecks.passed + prevIntentChecks.failed + prevIntentChecks.warning,
              issues: [],
              reports: (prevIntentChecks as any).reports || []
            } : null,
            nis2Articles: prevNIS2Articles,
            metrics: {
              totalDevices: prevDevices.length,
              activeAlerts: finalPrevActiveAlerts,
              complianceScore: finalPrevScore,
              intentChecksPassed: prevIntentChecks?.passed || 0,
              intentChecksFailed: prevIntentChecks?.failed || 0,
              lastUpdated: new Date()
            },
            loadingBatch: 5,
            fetchedAt: Date.now()
          }
          useDashboardStore.getState().setNIS2PreviousSnapshotData(nis2PreviousSnapshotData)

          // Also store in multi-snapshot cache for instant switching
          useDashboardStore.getState().cacheNIS2Snapshot(nis2PreviousSnapshotData)

          console.log(`[Dashboard] NIS2 comparison snapshot loaded: ${comparisonSnapshotId}`)
        }

        // Set final previous metrics (shared)
        const prevMetricsData = {
          totalDevices: prevDevices.length,
          activeAlerts: finalPrevActiveAlerts,
          complianceScore: finalPrevScore,
          intentChecksPassed: prevIntentChecks?.passed || 0,
          intentChecksFailed: prevIntentChecks?.failed || 0,
          lastUpdated: new Date()
        }
        setPreviousMetrics(prevMetricsData)
        setPreviousDevices(prevDevices)

      } catch (error) {
        console.error('[Dashboard] Failed to load comparison snapshot:', error)
        // Reset framework-specific loading states
        if (selectedFramework === 'cis-v8') {
          setPreviousLoadingBatch(0)
          setPreviousSnapshotData(null)
        } else if (selectedFramework === 'pci-dss') {
          setPciDssPreviousLoadingBatch(0)
          useDashboardStore.getState().setPciDssPreviousSnapshotData(null)
        } else if (selectedFramework === 'nis2') {
          setNIS2PreviousLoadingBatch(0)
          useDashboardStore.getState().setNIS2PreviousSnapshotData(null)
        } else {
          setNistPreviousLoadingBatch(0)
          useDashboardStore.getState().setNistPreviousSnapshotData(null)
        }
      } finally {
        setIsFetchingPrevious(false)
      }
    }

    fetchComparisonSnapshot()
    // Cache data (previousSnapshotData, isFetchingPrevious, etc.) checked inside with early return, not a dependency to prevent infinite loop
    // snapshots is NOT a dependency - we only search it inside, not listen to array changes
    // loadingBatch/pciDssLoadingBatch/nistLoadingBatch IS a dependency - we need to know when current snapshot finishes (becomes 5) to start comparison
    // selectedFramework IS a dependency - framework change should trigger appropriate comparison loading
    // Guards (isFetchingPrevious, cache check) prevent duplicate fetches when loadingBatch changes during progressive loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonSnapshotId, loadingBatch, pciDssLoadingBatch, nistLoadingBatch, nis2LoadingBatch, selectedFramework])

  // Calculate framework-aware loading batch for consumer components
  // Pages check `loadingBatch < 5` to show skeletons - this ensures they get the right batch
  const effectiveLoadingBatch = selectedFramework === 'nist'
    ? nistLoadingBatch
    : selectedFramework === 'pci-dss'
      ? pciDssLoadingBatch
      : selectedFramework === 'nis2'
        ? nis2LoadingBatch
        : loadingBatch

  // Same for previous loading batch (comparison mode)
  const effectivePreviousLoadingBatch = selectedFramework === 'nist'
    ? nistPreviousLoadingBatch
    : selectedFramework === 'pci-dss'
      ? pciDssPreviousLoadingBatch
      : selectedFramework === 'nis2'
        ? nis2PreviousLoadingBatch
        : previousLoadingBatch

  return {
    metrics,
    previousMetrics,
    loading,
    selectedSnapshot,
    currentSnapshot: getCurrentSnapshot(),
    devices,
    intentCheckDetails,

    // Framework selection
    selectedFramework,

    // CIS data
    cisControls,
    loadingBatch: effectiveLoadingBatch,  // Framework-aware loading batch
    previousLoadingBatch: effectivePreviousLoadingBatch,  // Framework-aware previous loading batch
    previousCisControls,
    // Keep individual framework batches for debugging
    cisLoadingBatch: loadingBatch,

    // PCI-DSS data
    pciDssRequirements,
    pciDssLoadingBatch,
    pciDssPreviousLoadingBatch,
    previousPciDssRequirements,

    // NIST data
    nistFunctions,
    nistLoadingBatch,
    nistPreviousLoadingBatch,
    previousNistFunctions,

    // NIS2 data
    nis2Articles,
    previousNIS2Articles,
    nis2LoadingBatch,
    nis2PreviousLoadingBatch,

    dataAvailability,
    // Previous snapshot's complete data
    previousDevices,
    previousIntentCheckDetails,
    previousDataAvailability,
    previousSnapshot
  }
}