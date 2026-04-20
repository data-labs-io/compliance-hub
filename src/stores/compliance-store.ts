import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { rateLimitedFetch } from '@/lib/rate-limited-fetch'

export type ComplianceStatus = 'pass' | 'warning' | 'fail' | 'not_applicable'
export type FrameworkType = 'CIS' | 'DORA' | 'NIST' | 'NIS2' | 'HIPAA' | 'ISO27001' | 'PCI-DSS'

export interface CISControl {
  id: string
  name: string
  category: string
  maxPoints: number
  currentScore: number
  safeguards: CISSafeguard[]
  applicable: boolean
  description: string
}

export interface CISSafeguard {
  id: string
  controlId: string
  name: string
  description: string
  ipFabricContext: string
  ipFabricInfo: string
  currentValue: number | string
  previousValue?: number | string
  target: number | string
  delta?: number
  status: ComplianceStatus
  weight: number
}

export interface ComplianceSnapshot {
  id: string
  uuid: string
  timestamp: Date
  name: string
  deviceCount: number
  siteCount: number
  score: number
  maxScore: number
  percentage: number
  controls: CISControl[]
  framework: FrameworkType
}

interface ComplianceState {
  // Current snapshot
  currentSnapshot: ComplianceSnapshot | null
  setCurrentSnapshot: (snapshot: string) => void

  // Compare snapshot
  compareSnapshot: ComplianceSnapshot | null
  setCompareSnapshot: (snapshot: string | null) => void

  // Selected framework
  selectedFramework: FrameworkType
  setSelectedFramework: (framework: FrameworkType) => void

  // Controls data
  controls: CISControl[]
  setControls: (controls: CISControl[]) => void
  updateControl: (controlId: string, data: Partial<CISControl>) => void

  // Compliance scores
  overallScore: number
  setOverallScore: (score: number) => void
  grade: string
  setGrade: (grade: string) => void

  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Error handling
  error: string | null
  setError: (error: string | null) => void

  // Filter and sort
  controlFilter: 'all' | 'passed' | 'failed' | 'warning'
  setControlFilter: (filter: 'all' | 'passed' | 'failed' | 'warning') => void
  sortBy: 'id' | 'name' | 'score' | 'status'
  setSortBy: (sort: 'id' | 'name' | 'score' | 'status') => void
  sortOrder: 'asc' | 'desc'
  toggleSortOrder: () => void

  // Expanded controls (for UI)
  expandedControls: Set<string>
  toggleControlExpansion: (controlId: string) => void
  expandAllControls: () => void
  collapseAllControls: () => void

  // Data loading
  loadComplianceData: (snapshotId: string) => Promise<void>
  refreshCompliance: () => Promise<void>
  compareSnapshots: (snapshot1: string, snapshot2: string) => Promise<void>

  // Computed values
  getFilteredControls: () => CISControl[]
  getPassedCount: () => number
  getFailedCount: () => number
  getWarningCount: () => number
}

export const useComplianceStore = create<ComplianceState>()(
  devtools(
    (set, get) => ({
      // Current snapshot
      currentSnapshot: null,
      setCurrentSnapshot: (snapshot) => {
        // This would typically trigger a data load
        get().loadComplianceData(snapshot)
      },

      // Compare snapshot
      compareSnapshot: null,
      setCompareSnapshot: (snapshot) => {
        if (snapshot && get().currentSnapshot) {
          get().compareSnapshots(get().currentSnapshot!.uuid, snapshot)
        } else {
          set({ compareSnapshot: null })
        }
      },

      // Selected framework
      selectedFramework: 'CIS',
      setSelectedFramework: (framework) => set({ selectedFramework: framework }),

      // Controls data
      controls: [],
      setControls: (controls) => set({ controls }),
      updateControl: (controlId, data) =>
        set((state) => ({
          controls: state.controls.map((control) =>
            control.id === controlId ? { ...control, ...data } : control
          ),
        })),

      // Compliance scores
      overallScore: 0,
      setOverallScore: (score) => set({ overallScore: score }),
      grade: 'N/A',
      setGrade: (grade) => set({ grade }),

      // Loading states
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),

      // Error handling
      error: null,
      setError: (error) => set({ error }),

      // Filter and sort
      controlFilter: 'all',
      setControlFilter: (filter) => set({ controlFilter: filter }),
      sortBy: 'id',
      setSortBy: (sort) => set({ sortBy: sort }),
      sortOrder: 'asc',
      toggleSortOrder: () =>
        set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' })),

      // Expanded controls
      expandedControls: new Set(),
      toggleControlExpansion: (controlId) =>
        set((state) => {
          const newExpanded = new Set(state.expandedControls)
          if (newExpanded.has(controlId)) {
            newExpanded.delete(controlId)
          } else {
            newExpanded.add(controlId)
          }
          return { expandedControls: newExpanded }
        }),
      expandAllControls: () =>
        set((state) => ({
          expandedControls: new Set(state.controls.map((c) => c.id)),
        })),
      collapseAllControls: () => set({ expandedControls: new Set() }),

      // Data loading
      loadComplianceData: async (snapshotId) => {
        set({ isLoading: true, error: null })
        try {
          // Fetch compliance data from API (rate-limited)
          const response = await rateLimitedFetch(
            `/api/ipfabric/proxy/compliance/${get().selectedFramework}?snapshot=${snapshotId}`,
            undefined,
            `compliance-load-${snapshotId}`
          )

          if (!response.ok) {
            throw new Error('Failed to load compliance data')
          }

          const data = await response.json()

          // Calculate overall score
          const totalScore = data.controls.reduce(
            (sum: number, control: CISControl) => sum + control.currentScore,
            0
          )
          const maxScore = data.controls.reduce(
            (sum: number, control: CISControl) =>
              sum + (control.applicable ? control.maxPoints : 0),
            0
          )
          const percentage = (totalScore / maxScore) * 100

          // Calculate grade
          const grade =
            percentage >= 95
              ? 'A+'
              : percentage >= 90
              ? 'A'
              : percentage >= 85
              ? 'B+'
              : percentage >= 80
              ? 'B'
              : percentage >= 75
              ? 'C+'
              : percentage >= 70
              ? 'C'
              : percentage >= 60
              ? 'D'
              : 'F'

          set({
            currentSnapshot: data,
            controls: data.controls,
            overallScore: percentage,
            grade,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load compliance data',
            isLoading: false,
          })
        }
      },

      refreshCompliance: async () => {
        const currentSnapshot = get().currentSnapshot
        if (currentSnapshot) {
          await get().loadComplianceData(currentSnapshot.uuid)
        }
      },

      compareSnapshots: async (snapshot1, snapshot2) => {
        set({ isLoading: true, error: null })
        try {
          // Sequential rate-limited calls (avoid parallel requests that bypass rate limiter)
          const response1 = await rateLimitedFetch(
            `/api/ipfabric/proxy/compliance/${get().selectedFramework}?snapshot=${snapshot1}`,
            undefined,
            'compliance-compare'
          )
          const response2 = await rateLimitedFetch(
            `/api/ipfabric/proxy/compliance/${get().selectedFramework}?snapshot=${snapshot2}`,
            undefined,
            'compliance-compare'
          )

          if (!response1.ok || !response2.ok) {
            throw new Error('Failed to load comparison data')
          }

          const [data1, data2] = await Promise.all([response1.json(), response2.json()])

          // Merge and compare controls
          const comparedControls = data1.controls.map((control1: CISControl) => {
            const control2 = data2.controls.find((c: CISControl) => c.id === control1.id)
            if (control2) {
              // Add comparison data to safeguards
              const comparedSafeguards = control1.safeguards.map((s1: CISSafeguard) => {
                const s2 = control2.safeguards.find((s: CISSafeguard) => s.id === s1.id)
                if (s2) {
                  return {
                    ...s1,
                    previousValue: s2.currentValue,
                    delta:
                      typeof s1.currentValue === 'number' && typeof s2.currentValue === 'number'
                        ? s1.currentValue - s2.currentValue
                        : 0,
                  }
                }
                return s1
              })
              return { ...control1, safeguards: comparedSafeguards }
            }
            return control1
          })

          set({
            currentSnapshot: data1,
            compareSnapshot: data2,
            controls: comparedControls,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to compare snapshots',
            isLoading: false,
          })
        }
      },

      // Computed values
      getFilteredControls: () => {
        const state = get()
        let filtered = state.controls

        // Apply filter
        if (state.controlFilter !== 'all') {
          filtered = filtered.filter((control) => {
            const safeguardStatuses = control.safeguards.map((s) => s.status)
            switch (state.controlFilter) {
              case 'passed':
                return safeguardStatuses.every((s) => s === 'pass')
              case 'failed':
                return safeguardStatuses.some((s) => s === 'fail')
              case 'warning':
                return safeguardStatuses.some((s) => s === 'warning')
              default:
                return true
            }
          })
        }

        // Apply sort
        filtered.sort((a, b) => {
          let comparison = 0
          switch (state.sortBy) {
            case 'id':
              comparison = a.id.localeCompare(b.id)
              break
            case 'name':
              comparison = a.name.localeCompare(b.name)
              break
            case 'score':
              comparison = a.currentScore - b.currentScore
              break
            case 'status':
              // Sort by worst status first
              const getStatusPriority = (control: CISControl) => {
                const statuses = control.safeguards.map((s) => s.status)
                if (statuses.some((s) => s === 'fail')) return 0
                if (statuses.some((s) => s === 'warning')) return 1
                if (statuses.every((s) => s === 'pass')) return 2
                return 3
              }
              comparison = getStatusPriority(a) - getStatusPriority(b)
              break
          }

          return state.sortOrder === 'asc' ? comparison : -comparison
        })

        return filtered
      },

      getPassedCount: () => {
        const controls = get().controls
        return controls.filter((control) =>
          control.safeguards.every((s) => s.status === 'pass')
        ).length
      },

      getFailedCount: () => {
        const controls = get().controls
        return controls.filter((control) =>
          control.safeguards.some((s) => s.status === 'fail')
        ).length
      },

      getWarningCount: () => {
        const controls = get().controls
        return controls.filter((control) =>
          control.safeguards.some((s) => s.status === 'warning')
        ).length
      },
    }),
    {
      name: 'compliance-store',
    }
  )
)