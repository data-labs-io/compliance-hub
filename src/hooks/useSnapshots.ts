import { useState, useEffect, useRef, useMemo } from 'react'
import type { Snapshot } from '@/types/ipfabric-api'
import { rateLimitedFetch } from '@/lib/rate-limited-fetch'

export type { Snapshot }

interface UseSnapshotsReturn {
  snapshots: Snapshot[]
  selectedSnapshot: string
  setSelectedSnapshot: (id: string) => void
  loading: boolean
  error: string | null
  refreshSnapshots: () => Promise<void>
}

export function useSnapshots(): UseSnapshotsReturn {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>('$last')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastInstanceRef = useRef<string | null>(null)

  const fetchSnapshots = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      setError(null)

      // Add a cache buster to force fresh data
      const url = forceRefresh
        ? `/api/ipfabric/snapshots?t=${Date.now()}`
        : '/api/ipfabric/snapshots'

      const response = await rateLimitedFetch(
        url,
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store',
        },
        'snapshots-fetch'
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch snapshots: ${response.status}`)
      }

      const data = await response.json()
      const snapshotList = data.data || []

      // Format snapshots to match our interface
      // Trust displayName from API route (already set correctly)
      // Also deduplicate based on actual snapshot ID AND timestamp

      const snapshotMap = new Map<string, Snapshot>()
      const timestampMap = new Map<string, string>() // Track timestamps → snapshot IDs

      snapshotList.forEach((snapshot: any) => {
        // Skip if this snapshot ID already exists (prevent ID duplicates)
        if (snapshotMap.has(snapshot.id)) {
          return
        }

        // Get snapshot timestamp for deduplication
        const createdAt = snapshot.createdAt || new Date().toISOString()
        // Floor timestamp to nearest second (remove milliseconds)
        // This prevents duplicates when IP Fabric returns snapshots with same second but different milliseconds
        const date = new Date(createdAt)
        date.setMilliseconds(0)
        const timestampKey = date.getTime().toString()

        // Check if we already have a snapshot created in the same second
        // This prevents duplicate entries with same date but different IDs
        if (timestampMap.has(timestampKey)) {
          console.log(`[useSnapshots] Skipping duplicate snapshot with same second-level timestamp: ${snapshot.id} (duplicate of ${timestampMap.get(timestampKey)})`)
          return  // Skip timestamp duplicate
        }

        // Trust the displayName from API - it's already set correctly in the API route
        // API route handles "Latest Snapshot" naming based on sort order
        const formatted: Snapshot = {
          id: snapshot.id,
          name: snapshot.name || `Snapshot ${snapshot.id}`,
          displayName: snapshot.displayName || snapshot.name || `Snapshot ${snapshot.id}`,
          note: snapshot.note || '',
          createdAt: createdAt,
          state: snapshot.state || 'unloaded',
          locked: snapshot.locked || false,
          version: snapshot.version || ''
        }

        // Add to maps, using the actual snapshot ID and timestamp as keys
        snapshotMap.set(formatted.id, formatted)
        timestampMap.set(timestampKey, formatted.id)
      })

      const formattedSnapshots = Array.from(snapshotMap.values())

      // Update snapshots
      setSnapshots(formattedSnapshots)

      // Only change selection if:
      // 1. We don't have a selection yet (initial load)
      // 2. The currently selected snapshot no longer exists
      const currentSelectionExists = formattedSnapshots.find(s => s.id === selectedSnapshot)

      if (!selectedSnapshot || !currentSelectionExists) {
        // Need to select a new snapshot
        // CRITICAL: Only select from loaded snapshots to ensure data availability
        const loadedSnapshots = formattedSnapshots.filter(s => s.state === 'loaded')

        if (loadedSnapshots.length > 0) {
          const hasLastSnapshot = loadedSnapshots.find(s => s.id === '$last')
          if (hasLastSnapshot) {
            setSelectedSnapshot('$last')
          } else {
            // Select first loaded snapshot (sorted by date, most recent first)
            setSelectedSnapshot(loadedSnapshots[0].id)
          }
        } else if (formattedSnapshots.length > 0) {
          // Fallback: if no loaded snapshots, select first one anyway
          // (it will load in the background)
          setSelectedSnapshot(formattedSnapshots[0].id)
        }
      }
      // Otherwise keep the current selection

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching snapshots:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshSnapshots = async () => {
    // Force refresh to get latest data
    await fetchSnapshots(true)
  }

  useEffect(() => {
    // Initial fetch only - no auto-refresh
    fetchSnapshots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    snapshots,
    selectedSnapshot,
    setSelectedSnapshot,
    loading,
    error,
    refreshSnapshots
  }
}