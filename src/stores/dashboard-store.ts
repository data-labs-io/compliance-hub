import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import { PersistenceManager } from '@/infrastructure/persistence/PersistenceManager'
import type { CISControl } from '@/frameworks/cis'
import type { PCIDSSRequirement } from '@/frameworks/pci-dss'
import type { NISTCSFFunction } from '@/frameworks/nist-csf'
import type { NIS2Article } from '@/frameworks/nis2'
import type { DataAvailabilitySummary } from '@/types/data-availability'

export interface DashboardMetrics {
  totalDevices: number
  activeAlerts: number
  complianceScore: number
  intentChecksPassed: number
  intentChecksFailed: number
  lastUpdated: Date | null
}

// Cached snapshot data structure for CIS
export interface SnapshotData {
  snapshotId: string
  devices: any[]
  intentCheckDetails: any | null
  cisControls: CISControl[]
  dataAvailability: DataAvailabilitySummary
  metrics: DashboardMetrics
  loadingBatch: number // 0-5, where 5 = complete
  fetchedAt: number // timestamp
}

// Cached snapshot data structure for PCI-DSS
export interface PCIDSSSnapshotData {
  snapshotId: string
  devices: any[]
  intentCheckDetails: any | null
  pciDssRequirements: PCIDSSRequirement[]
  metrics: DashboardMetrics
  loadingBatch: number // 0-5, where 5 = complete
  fetchedAt: number // timestamp
}

// Cached snapshot data structure for NIST CSF
export interface NISTSnapshotData {
  snapshotId: string
  devices: any[]
  intentCheckDetails: any | null
  nistFunctions: NISTCSFFunction[]
  metrics: DashboardMetrics
  loadingBatch: number // 0-5, where 5 = complete
  fetchedAt: number // timestamp
}

// Cached snapshot data structure for NIS2
export interface NIS2SnapshotData {
  snapshotId: string
  devices: any[]
  intentCheckDetails: any | null
  nis2Articles: NIS2Article[]
  metrics: DashboardMetrics
  loadingBatch: number // 0-5, where 5 = complete
  fetchedAt: number // timestamp
}

export interface DashboardFilter {
  timeRange: '1h' | '24h' | '7d' | '30d' | 'custom'
  sites: string[]
  deviceTypes: string[]
  severity: 'all' | 'critical' | 'high' | 'medium' | 'low'
  customDateRange?: {
    start: Date
    end: Date
  }
}

interface DashboardState {
  // Metrics
  metrics: DashboardMetrics
  setMetrics: (metrics: Partial<DashboardMetrics>) => void
  updateMetric: (key: keyof DashboardMetrics, value: any) => void

  // Global shared state for devices and intent check details
  // These are shared across all components using useSnapshotAwareDashboard
  devices: any[]
  setDevices: (devices: any[]) => void
  intentCheckDetails: any | null
  setIntentCheckDetails: (details: any | null) => void

  // Filters
  filters: DashboardFilter
  setFilters: (filters: Partial<DashboardFilter>) => void
  resetFilters: () => void

  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Error handling
  error: string | null
  setError: (error: string | null) => void

  // Selected items
  selectedDevices: string[]
  setSelectedDevices: (devices: string[]) => void
  toggleDeviceSelection: (deviceId: string) => void

  // View preferences
  viewMode: 'grid' | 'list' | 'map'
  setViewMode: (mode: 'grid' | 'list' | 'map') => void

  // Widget visibility
  visibleWidgets: Record<string, boolean>
  toggleWidget: (widgetId: string) => void
  setWidgetVisibility: (widgetId: string, visible: boolean) => void

  // Comparison snapshot selection (shared across all dashboard pages)
  selectedComparisonSnapshot: string | null
  setSelectedComparisonSnapshot: (snapshotId: string | null) => void

  // Pending control expansion (for search navigation)
  pendingExpandedControl: string | null
  setPendingExpandedControl: (controlId: string | null) => void

  // Pending safeguard scroll (for search navigation to specific safeguards)
  pendingSafeguardId: string | null
  setPendingSafeguardId: (safeguardId: string | null) => void

  // Session cache (IP Fabric URL, not persisted)
  sessionApiUrl: string | null
  setSessionApiUrl: (url: string | null) => void

  // Framework selection
  selectedFramework: 'cis-v8' | 'pci-dss' | 'nist' | 'nis2'
  setSelectedFramework: (framework: 'cis-v8' | 'pci-dss' | 'nist' | 'nis2') => void

  // CIS: Global snapshot data cache (shared across all pages)
  currentSnapshotData: SnapshotData | null
  previousSnapshotData: SnapshotData | null
  setCurrentSnapshotData: (data: SnapshotData | null) => void
  setPreviousSnapshotData: (data: SnapshotData | null) => void
  updateCurrentSnapshotData: (data: Partial<SnapshotData>) => void
  updatePreviousSnapshotData: (data: Partial<SnapshotData>) => void
  clearSnapshotCache: () => void

  // CIS: Fetching state tracking (global refs)
  isFetchingCurrent: boolean
  isFetchingPrevious: boolean
  setIsFetchingCurrent: (fetching: boolean) => void
  setIsFetchingPrevious: (fetching: boolean) => void

  // PCI-DSS: Global snapshot data cache
  pciDssCurrentSnapshotData: PCIDSSSnapshotData | null
  pciDssPreviousSnapshotData: PCIDSSSnapshotData | null
  setPciDssCurrentSnapshotData: (data: PCIDSSSnapshotData | null) => void
  setPciDssPreviousSnapshotData: (data: PCIDSSSnapshotData | null) => void
  updatePciDssCurrentSnapshotData: (data: Partial<PCIDSSSnapshotData>) => void
  updatePciDssPreviousSnapshotData: (data: Partial<PCIDSSSnapshotData>) => void
  clearPciDssSnapshotCache: () => void

  // PCI-DSS: Fetching state tracking
  isFetchingPciDssCurrent: boolean
  isFetchingPciDssPrevious: boolean
  setIsFetchingPciDssCurrent: (fetching: boolean) => void
  setIsFetchingPciDssPrevious: (fetching: boolean) => void

  // NIST: Global snapshot data cache
  nistCurrentSnapshotData: NISTSnapshotData | null
  nistPreviousSnapshotData: NISTSnapshotData | null
  setNistCurrentSnapshotData: (data: NISTSnapshotData | null) => void
  setNistPreviousSnapshotData: (data: NISTSnapshotData | null) => void
  updateNistCurrentSnapshotData: (data: Partial<NISTSnapshotData>) => void
  updateNistPreviousSnapshotData: (data: Partial<NISTSnapshotData>) => void
  clearNistSnapshotCache: () => void

  // NIST: Fetching state tracking
  isFetchingNistCurrent: boolean
  isFetchingNistPrevious: boolean
  setIsFetchingNistCurrent: (fetching: boolean) => void
  setIsFetchingNistPrevious: (fetching: boolean) => void

  // NIS2 Framework
  nis2CurrentSnapshotData: NIS2SnapshotData | null
  nis2PreviousSnapshotData: NIS2SnapshotData | null
  nis2SnapshotCache: Record<string, NIS2SnapshotData>
  setNIS2CurrentSnapshotData: (data: NIS2SnapshotData | null) => void
  updateNIS2CurrentSnapshotData: (partial: Partial<NIS2SnapshotData>) => void
  setNIS2PreviousSnapshotData: (data: NIS2SnapshotData | null) => void
  cacheNIS2Snapshot: (data: NIS2SnapshotData) => void

  // Multi-snapshot cache for instant switching
  snapshotCache: Record<string, SnapshotData>
  pciDssSnapshotCache: Record<string, PCIDSSSnapshotData>
  nistSnapshotCache: Record<string, NISTSnapshotData>
  cacheSnapshot: (data: SnapshotData) => void
  cachePciDssSnapshot: (data: PCIDSSSnapshotData) => void
  cacheNistSnapshot: (data: NISTSnapshotData) => void
  getCachedSnapshot: (snapshotId: string) => SnapshotData | null
  getCachedPciDssSnapshot: (snapshotId: string) => PCIDSSSnapshotData | null
  getCachedNistSnapshot: (snapshotId: string) => NISTSnapshotData | null
  clearAllSnapshotCaches: () => void

  // Accessibility - Colorblind Mode
  colorBlindMode: boolean
  setColorBlindMode: (enabled: boolean) => void

  // Refresh
  lastRefresh: Date | null
  refreshDashboard: () => Promise<void>
}

const defaultMetrics: DashboardMetrics = {
  totalDevices: 0,
  activeAlerts: 0,
  complianceScore: 0,
  intentChecksPassed: 0,
  intentChecksFailed: 0,
  lastUpdated: null,
}

const defaultFilters: DashboardFilter = {
  timeRange: '24h',
  sites: [],
  deviceTypes: [],
  severity: 'all',
}

const defaultVisibleWidgets: Record<string, boolean> = {
  metrics: true,
  complianceChart: true,
  intentChecks: true,
  deviceStatus: true,
  topology: true,
  alerts: true,
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    persist(
      (set, get) => ({
        // Metrics
        metrics: defaultMetrics,
        setMetrics: (metrics) =>
          set((state) => ({
            metrics: { ...state.metrics, ...metrics },
          })),
        updateMetric: (key, value) =>
          set((state) => ({
            metrics: { ...state.metrics, [key]: value },
          })),

        // Global shared state for devices and intent check details
        devices: [],
        setDevices: (devices) => set({ devices }),
        intentCheckDetails: null,
        setIntentCheckDetails: (details) => set({ intentCheckDetails: details }),

        // Filters
        filters: defaultFilters,
        setFilters: (filters) =>
          set((state) => ({
            filters: { ...state.filters, ...filters },
          })),
        resetFilters: () => set({ filters: defaultFilters }),

        // Loading states
        isLoading: false,
        setIsLoading: (loading) => set({ isLoading: loading }),

        // Error handling
        error: null,
        setError: (error) => set({ error }),

        // Selected items
        selectedDevices: [],
        setSelectedDevices: (devices) => set({ selectedDevices: devices }),
        toggleDeviceSelection: (deviceId) =>
          set((state) => {
            const isSelected = state.selectedDevices.includes(deviceId)
            return {
              selectedDevices: isSelected
                ? state.selectedDevices.filter((id) => id !== deviceId)
                : [...state.selectedDevices, deviceId],
            }
          }),

        // View preferences
        viewMode: 'grid',
        setViewMode: (mode) => set({ viewMode: mode }),

        // Widget visibility
        visibleWidgets: defaultVisibleWidgets,
        toggleWidget: (widgetId) =>
          set((state) => ({
            visibleWidgets: {
              ...state.visibleWidgets,
              [widgetId]: !state.visibleWidgets[widgetId],
            },
          })),
        setWidgetVisibility: (widgetId, visible) =>
          set((state) => ({
            visibleWidgets: {
              ...state.visibleWidgets,
              [widgetId]: visible,
            },
          })),

        // Comparison snapshot selection (shared across all pages)
        selectedComparisonSnapshot: null,
        setSelectedComparisonSnapshot: (snapshotId) =>
          set({ selectedComparisonSnapshot: snapshotId }),

        // Pending control expansion (for search navigation, not persisted)
        pendingExpandedControl: null,
        setPendingExpandedControl: (controlId) =>
          set({ pendingExpandedControl: controlId }),

        // Pending safeguard scroll (for search navigation, not persisted)
        pendingSafeguardId: null,
        setPendingSafeguardId: (safeguardId) =>
          set({ pendingSafeguardId: safeguardId }),

        // Session cache (IP Fabric URL, not persisted)
        sessionApiUrl: null,
        setSessionApiUrl: (url) =>
          set({ sessionApiUrl: url }),

        // Global snapshot data cache (shared across all pages)
        currentSnapshotData: null,
        previousSnapshotData: null,
        setCurrentSnapshotData: (data) => set({ currentSnapshotData: data }),
        setPreviousSnapshotData: (data) => set({ previousSnapshotData: data }),
        updateCurrentSnapshotData: (data) =>
          set((state) => ({
            currentSnapshotData: state.currentSnapshotData
              ? { ...state.currentSnapshotData, ...data }
              : null,
          })),
        updatePreviousSnapshotData: (data) =>
          set((state) => ({
            previousSnapshotData: state.previousSnapshotData
              ? { ...state.previousSnapshotData, ...data }
              : null,
          })),
        clearSnapshotCache: () =>
          set({
            currentSnapshotData: null,
            previousSnapshotData: null,
            isFetchingCurrent: false,
            isFetchingPrevious: false,
          }),

        // Fetching state tracking (global refs)
        isFetchingCurrent: false,
        isFetchingPrevious: false,
        setIsFetchingCurrent: (fetching) => set({ isFetchingCurrent: fetching }),
        setIsFetchingPrevious: (fetching) => set({ isFetchingPrevious: fetching }),

        // Framework selection
        selectedFramework: 'cis-v8',
        setSelectedFramework: (framework) => set({ selectedFramework: framework }),

        // PCI-DSS: Global snapshot data cache
        pciDssCurrentSnapshotData: null,
        pciDssPreviousSnapshotData: null,
        setPciDssCurrentSnapshotData: (data) => set({ pciDssCurrentSnapshotData: data }),
        setPciDssPreviousSnapshotData: (data) => set({ pciDssPreviousSnapshotData: data }),
        updatePciDssCurrentSnapshotData: (data) =>
          set((state) => ({
            pciDssCurrentSnapshotData: state.pciDssCurrentSnapshotData
              ? { ...state.pciDssCurrentSnapshotData, ...data }
              : null,
          })),
        updatePciDssPreviousSnapshotData: (data) =>
          set((state) => ({
            pciDssPreviousSnapshotData: state.pciDssPreviousSnapshotData
              ? { ...state.pciDssPreviousSnapshotData, ...data }
              : null,
          })),
        clearPciDssSnapshotCache: () =>
          set({
            pciDssCurrentSnapshotData: null,
            pciDssPreviousSnapshotData: null,
            isFetchingPciDssCurrent: false,
            isFetchingPciDssPrevious: false,
          }),

        // PCI-DSS: Fetching state tracking
        isFetchingPciDssCurrent: false,
        isFetchingPciDssPrevious: false,
        setIsFetchingPciDssCurrent: (fetching) => set({ isFetchingPciDssCurrent: fetching }),
        setIsFetchingPciDssPrevious: (fetching) => set({ isFetchingPciDssPrevious: fetching }),

        // NIST: Global snapshot data cache
        nistCurrentSnapshotData: null,
        nistPreviousSnapshotData: null,
        setNistCurrentSnapshotData: (data) => set({ nistCurrentSnapshotData: data }),
        setNistPreviousSnapshotData: (data) => set({ nistPreviousSnapshotData: data }),
        updateNistCurrentSnapshotData: (data) =>
          set((state) => ({
            nistCurrentSnapshotData: state.nistCurrentSnapshotData
              ? { ...state.nistCurrentSnapshotData, ...data }
              : null,
          })),
        updateNistPreviousSnapshotData: (data) =>
          set((state) => ({
            nistPreviousSnapshotData: state.nistPreviousSnapshotData
              ? { ...state.nistPreviousSnapshotData, ...data }
              : null,
          })),
        clearNistSnapshotCache: () =>
          set({
            nistCurrentSnapshotData: null,
            nistPreviousSnapshotData: null,
            isFetchingNistCurrent: false,
            isFetchingNistPrevious: false,
          }),

        // NIST: Fetching state tracking
        isFetchingNistCurrent: false,
        isFetchingNistPrevious: false,
        setIsFetchingNistCurrent: (fetching) => set({ isFetchingNistCurrent: fetching }),
        setIsFetchingNistPrevious: (fetching) => set({ isFetchingNistPrevious: fetching }),

        // NIS2: Global snapshot data cache
        nis2CurrentSnapshotData: null,
        nis2PreviousSnapshotData: null,
        nis2SnapshotCache: {},
        setNIS2CurrentSnapshotData: (data) => set({ nis2CurrentSnapshotData: data }),
        updateNIS2CurrentSnapshotData: (partial) => set((state) => ({
          nis2CurrentSnapshotData: state.nis2CurrentSnapshotData
            ? { ...state.nis2CurrentSnapshotData, ...partial }
            : null
        })),
        setNIS2PreviousSnapshotData: (data) => set({ nis2PreviousSnapshotData: data }),
        cacheNIS2Snapshot: (data) => set((state) => ({
          nis2SnapshotCache: {
            ...state.nis2SnapshotCache,
            [data.snapshotId]: data
          }
        })),

        // Multi-snapshot cache for instant switching
        snapshotCache: {},
        pciDssSnapshotCache: {},
        nistSnapshotCache: {},

        // Cache a CIS snapshot (with LRU eviction)
        cacheSnapshot: (data) => set((state) => {
          const newCache = { ...state.snapshotCache, [data.snapshotId]: data }

          // LRU eviction if over limit (max 10 snapshots)
          const MAX_CACHED = 10
          const keys = Object.keys(newCache)
          if (keys.length > MAX_CACHED) {
            const oldest = keys
              .filter(k => k !== state.currentSnapshotData?.snapshotId) // Don't evict active
              .map(k => ({ k, t: newCache[k].fetchedAt }))
              .sort((a, b) => a.t - b.t)[0]?.k
            if (oldest) delete newCache[oldest]
          }

          return { snapshotCache: newCache }
        }),

        // Cache a PCI-DSS snapshot (with LRU eviction)
        cachePciDssSnapshot: (data) => set((state) => {
          const newCache = { ...state.pciDssSnapshotCache, [data.snapshotId]: data }

          const MAX_CACHED = 10
          const keys = Object.keys(newCache)
          if (keys.length > MAX_CACHED) {
            const oldest = keys
              .filter(k => k !== state.pciDssCurrentSnapshotData?.snapshotId)
              .map(k => ({ k, t: newCache[k].fetchedAt }))
              .sort((a, b) => a.t - b.t)[0]?.k
            if (oldest) delete newCache[oldest]
          }

          return { pciDssSnapshotCache: newCache }
        }),

        // Cache a NIST snapshot (with LRU eviction)
        cacheNistSnapshot: (data) => set((state) => {
          const newCache = { ...state.nistSnapshotCache, [data.snapshotId]: data }

          const MAX_CACHED = 10
          const keys = Object.keys(newCache)
          if (keys.length > MAX_CACHED) {
            const oldest = keys
              .filter(k => k !== state.nistCurrentSnapshotData?.snapshotId)
              .map(k => ({ k, t: newCache[k].fetchedAt }))
              .sort((a, b) => a.t - b.t)[0]?.k
            if (oldest) delete newCache[oldest]
          }

          return { nistSnapshotCache: newCache }
        }),

        getCachedSnapshot: (snapshotId) => get().snapshotCache[snapshotId] || null,

        getCachedPciDssSnapshot: (snapshotId) => get().pciDssSnapshotCache[snapshotId] || null,

        getCachedNistSnapshot: (snapshotId) => get().nistSnapshotCache[snapshotId] || null,

        clearAllSnapshotCaches: () => set({
          snapshotCache: {},
          pciDssSnapshotCache: {},
          nistSnapshotCache: {},
          currentSnapshotData: null,
          previousSnapshotData: null,
          pciDssCurrentSnapshotData: null,
          pciDssPreviousSnapshotData: null,
          nistCurrentSnapshotData: null,
          nistPreviousSnapshotData: null,
        }),

        // Accessibility - Colorblind Mode
        colorBlindMode: false,
        setColorBlindMode: (enabled) => set({ colorBlindMode: enabled }),

        // Refresh
        lastRefresh: null,
        refreshDashboard: async () => {
          set({ isLoading: true, error: null })
          try {
            // Note: Actual data fetching is handled by useSnapshotAwareDashboard hook
            // This function is kept for compatibility but delegates to the context/hook pattern
            // Metrics are updated via setMetrics() when data is loaded

            set({
              lastRefresh: new Date(),
              isLoading: false,
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'An error occurred',
              isLoading: false,
            })
          }
        },
      }),
      {
        name: 'dashboard-store',
        storage: createJSONStorage(() => ({
          getItem: async (name) => {
            // Skip during SSR
            if (typeof window === 'undefined') {
              return null
            }

            try {
              const persistence = PersistenceManager.getInstance()
              const data = await persistence.load(name)
              return data ? JSON.stringify(data) : null
            } catch (error) {
              console.error('Error loading from persistence:', error)
              return null
            }
          },
          setItem: async (name, value) => {
            // Skip during SSR
            if (typeof window === 'undefined') {
              return
            }

            try {
              const persistence = PersistenceManager.getInstance()
              // value is already a string from Zustand, parse it first
              const parsedValue = typeof value === 'string' ? JSON.parse(value) : value
              await persistence.save(name, parsedValue)
            } catch (error) {
              console.error('Error saving to persistence:', error)
            }
          },
          removeItem: async (name) => {
            // Skip during SSR
            if (typeof window === 'undefined') {
              return
            }

            try {
              const persistence = PersistenceManager.getInstance()
              await persistence.delete(name)
            } catch (error) {
              console.error('Error removing from persistence:', error)
            }
          },
        })),
        partialize: (state) => ({
          filters: state.filters,
          viewMode: state.viewMode,
          visibleWidgets: state.visibleWidgets,
          colorBlindMode: state.colorBlindMode,
          selectedComparisonSnapshot: state.selectedComparisonSnapshot,  // Persist to preserve across navigation
          selectedFramework: state.selectedFramework,  // Persist framework selection
        }),
      }
    ),
    {
      name: 'dashboard-store',
    }
  )
)