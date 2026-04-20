'use client'

import { createContext, useContext, ReactNode, useState, useMemo } from 'react'
import { useSnapshots, Snapshot } from '@/hooks/useSnapshots'

interface SnapshotContextType {
  snapshots: Snapshot[]
  filteredSnapshots: Snapshot[]
  selectedSnapshot: string
  setSelectedSnapshot: (id: string) => void
  loading: boolean
  error: string | null
  refreshSnapshots: () => Promise<void>
  getCurrentSnapshot: () => Snapshot | null
}

const SnapshotContext = createContext<SnapshotContextType | undefined>(undefined)

interface SnapshotProviderProps {
  children: ReactNode
}

export function SnapshotProvider({ children }: SnapshotProviderProps) {
  const snapshotData = useSnapshots()

  const getCurrentSnapshot = () => {
    return snapshotData.snapshots.find(s => s.id === snapshotData.selectedSnapshot) || null
  }

  // Always filter to only show loaded snapshots AND deduplicate
  const filteredSnapshots = useMemo(() => {
    const seenIds = new Set<string>()
    const seenTimestamps = new Set<string>()

    return snapshotData.snapshots.filter(snapshot => {
      // First filter: must be loaded
      if (snapshot.state !== 'loaded') return false

      // Second filter: deduplicate by ID
      if (seenIds.has(snapshot.id)) return false
      seenIds.add(snapshot.id)

      // Third filter: deduplicate by second-level timestamp
      const date = new Date(snapshot.createdAt)
      date.setMilliseconds(0)
      const timestampKey = date.getTime().toString()

      if (seenTimestamps.has(timestampKey)) {
        return false
      }
      seenTimestamps.add(timestampKey)

      return true
    })
  }, [snapshotData.snapshots])

  const value: SnapshotContextType = {
    ...snapshotData,
    filteredSnapshots,
    getCurrentSnapshot
  }

  return (
    <SnapshotContext.Provider value={value}>
      {children}
    </SnapshotContext.Provider>
  )
}

export function useSnapshotContext() {
  const context = useContext(SnapshotContext)
  if (context === undefined) {
    throw new Error('useSnapshotContext must be used within a SnapshotProvider')
  }
  return context
}