'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSnapshotAwareDashboard } from '@/hooks/useSnapshotAwareDashboard'
import { DashboardMetrics } from '@/stores/dashboard-store'
import { CISControl } from '@/frameworks/cis'

interface DashboardDataContextType {
  metrics: DashboardMetrics
  previousMetrics: DashboardMetrics | null
  loading: boolean
  selectedSnapshot: string
  currentSnapshot: any
  devices: any[]
  intentCheckDetails: any
  cisControls: CISControl[]
  refreshData: () => Promise<void>
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined)

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const dashboardData = useSnapshotAwareDashboard()
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshData = async () => {
    setRefreshKey(prev => prev + 1)
  }

  const contextValue: DashboardDataContextType = {
    ...dashboardData,
    refreshData
  }

  return (
    <DashboardDataContext.Provider value={contextValue}>
      {children}
    </DashboardDataContext.Provider>
  )
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext)
  if (!context) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider')
  }
  return context
}