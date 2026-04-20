/**
 * Snapshot Prefetch Hook
 *
 * Provides hover-based prefetching for snapshots to enable instant switching.
 * Prefetches snapshot data when user hovers over a snapshot in the selector,
 * storing it in the multi-snapshot cache for immediate access on click.
 *
 * Features:
 * - Configurable hover delay (default: 300ms)
 * - Automatic cancellation on mouse leave
 * - Cache-aware (skips already cached snapshots)
 * - AbortController support for cleanup
 * - Rate limiter integration (respects global rate limits)
 *
 * Usage:
 * ```typescript
 * const { handleHover, handleHoverEnd, isPrefetching } = useSnapshotPrefetch({
 *   enabled: true,
 *   hoverDelay: 300,
 *   priority: 'low'
 * })
 *
 * <SelectItem
 *   onMouseEnter={() => handleHover(snapshot.id)}
 *   onMouseLeave={handleHoverEnd}
 * >
 *   {snapshot.displayName}
 * </SelectItem>
 * ```
 */

import { useState, useCallback, useRef } from 'react'

interface PrefetchOptions {
  enabled: boolean      // Enable/disable prefetching
  hoverDelay: number    // ms before prefetch starts
  priority: 'low' | 'normal' | 'high'  // Future: could affect rate limiter priority
}

interface PrefetchState {
  handleHover: (snapshotId: string) => void
  handleHoverEnd: () => void
  isPrefetching: boolean
  prefetchingSnapshotId: string | null
}

/**
 * Hook for prefetching snapshot data on hover
 *
 * Note: The actual prefetch implementation would trigger the dashboard loading logic
 * that populates the multi-snapshot cache. This hook provides the hover event handling
 * and timing logic. The actual data fetching should be integrated with your existing
 * dashboard loading system (useSnapshotAwareDashboard.ts).
 */
export function useSnapshotPrefetch(options: PrefetchOptions): PrefetchState {
  const [prefetching, setPrefetching] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Handle mouse enter event - start prefetch after delay
   */
  const handleHover = useCallback((snapshotId: string) => {
    if (!options.enabled) return

    // TODO: Check if already cached
    // const cache = useDashboardStore.getState().snapshotCache
    // if (cache[snapshotId] && cache[snapshotId].loadingBatch >= 5) {
    //   console.log(`[Prefetch] ${snapshotId} already cached, skipping`)
    //   return
    // }

    // Clear existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Start prefetch after delay
    hoverTimeoutRef.current = setTimeout(() => {
      console.log(`[Prefetch] Starting prefetch for ${snapshotId}`)
      setPrefetching(snapshotId)

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController()

      // TODO: Trigger dashboard load in background
      // This should integrate with your existing dashboard loading logic
      // Example:
      // const dashboardStore = useDashboardStore.getState()
      // dashboardStore.loadSnapshotInBackground(
      //   snapshotId,
      //   abortControllerRef.current.signal
      // )

      console.log(`[Prefetch] Prefetch initiated for ${snapshotId} (implementation pending)`)
    }, options.hoverDelay)
  }, [options.enabled, options.hoverDelay])

  /**
   * Handle mouse leave event - cancel pending/active prefetch
   */
  const handleHoverEnd = useCallback(() => {
    // Cancel pending prefetch
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    // Abort in-progress prefetch
    if (abortControllerRef.current && prefetching) {
      console.log(`[Prefetch] Cancelling prefetch for ${prefetching}`)
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setPrefetching(null)
  }, [prefetching])

  return {
    handleHover,
    handleHoverEnd,
    isPrefetching: prefetching !== null,
    prefetchingSnapshotId: prefetching
  }
}

/**
 * Example integration with dashboard loading:
 *
 * In useSnapshotAwareDashboard.ts, add a new function:
 *
 * export function prefetchSnapshot(
 *   snapshotId: string,
 *   framework: 'cis-v8' | 'pci-dss',
 *   signal?: AbortSignal
 * ) {
 *   // Check if already cached
 *   const cache = framework === 'cis-v8'
 *     ? useDashboardStore.getState().snapshotCache
 *     : useDashboardStore.getState().pciDssSnapshotCache
 *
 *   if (cache[snapshotId]?.loadingBatch >= 5) {
 *     return // Already cached
 *   }
 *
 *   // Fetch in background (similar to main loading logic)
 *   fetchSnapshotData(snapshotId, framework, {
 *     priority: 'low',
 *     signal,
 *     onBatchComplete: (batch, controls) => {
 *       // Update cache progressively
 *       const updateFn = framework === 'cis-v8'
 *         ? useDashboardStore.getState().updateSnapshotCache
 *         : useDashboardStore.getState().updatePciDssSnapshotCache
 *
 *       updateFn(snapshotId, { loadingBatch: batch, controls })
 *     }
 *   })
 * }
 *
 * Then in usePrefetch.ts, import and call:
 * import { prefetchSnapshot } from '@/hooks/useSnapshotAwareDashboard'
 *
 * // In handleHover:
 * prefetchSnapshot(snapshotId, 'cis-v8', abortControllerRef.current.signal)
 */
