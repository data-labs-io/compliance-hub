'use client'

import { useState, useRef, useMemo, Suspense } from 'react'
import { DeviceStatusTable } from '@/components/dashboard/DeviceStatusTable'
import { useSnapshotAwareDashboard } from '@/hooks/useSnapshotAwareDashboard'
import { useSnapshotContext } from '@/contexts/SnapshotContext'
import { useDashboardStore } from '@/stores/dashboard-store'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

function DevicesPageContent() {
  const searchParams = useSearchParams()
  const initialDevice = searchParams.get('device') || ''
  const initialSearch = searchParams.get('search') || ''

  const [selectedDevice, setSelectedDevice] = useState<string>(initialDevice || initialSearch)
  const [selectedDevicePrevious, setSelectedDevicePrevious] = useState<string>('')
  const deviceTableRef = useRef<HTMLDivElement>(null)
  const deviceTablePreviousRef = useRef<HTMLDivElement>(null)

  // Get comparison snapshot selection from global store (persists across pages)
  const { selectedComparisonSnapshot, setSelectedComparisonSnapshot } = useDashboardStore()

  // Get snapshots from context for filtering
  const { snapshots, filteredSnapshots } = useSnapshotContext()

  // Get all data from the hook, passing the comparison snapshot ID
  const {
    metrics,
    previousMetrics,
    loading,
    currentSnapshot,
    previousSnapshot,
    devices,
    previousDevices,
    loadingBatch,
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

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2">Network Devices</h1>
        <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
          Monitor and manage network devices across all sites with detailed status, compliance scores, and configuration information.
        </p>
      </div>

      {/* Two-column comparison layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Latest Snapshot */}
        <div className="space-y-6">
          {/* Header for Latest Snapshot */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 min-h-[120px]">
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
                    <span className="mx-2">•</span>
                    {devices.length} devices
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Device Status Table */}
          <div ref={deviceTableRef}>
            <DeviceStatusTable
              devices={devices}
              metrics={metrics}
              currentSnapshot={currentSnapshot}
              loading={loading || loadingBatch < 5}
              initialSearchTerm={selectedDevice}
              onSearchChange={(term) => {
                if (!term) setSelectedDevice('')
              }}
            />
          </div>
        </div>

        {/* Right Column - Previous Snapshot */}
        <div className="space-y-6">
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
                      <span className="mx-2">•</span>
                      {previousDevices.length} devices
                    </div>
                  </div>
                  {/* Snapshot Selector */}
                  {olderSnapshots.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Compare With</label>
                      <Select
                        value={selectedComparisonSnapshot || (previousSnapshot?.id || '__auto__')}
                        onValueChange={(value) => setSelectedComparisonSnapshot(value === '__auto__' ? null : value)}
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
                          {/* Option to auto-select */}
                          <SelectItem value="__auto__">
                            <div className="flex w-full items-start gap-2 p-2">
                              <div className="mt-1.5 flex-shrink-0">
                                <div className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm leading-5 text-gray-900 dark:text-gray-100">
                                  Auto-select previous
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 leading-4 mt-0.5">
                                  Automatically compare with next older snapshot
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
                                    <div className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-400" />
                                    <div className="absolute inset-0 h-2 w-2 animate-pulse rounded-full bg-green-500 dark:bg-green-400 opacity-75" />
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
                                    <div className="text-xs text-gray-400 dark:text-gray-500 leading-4 mt-1 truncate" title={snapshot.note}>
                                      {snapshot.note}
                                    </div>
                                  )}
                                  {snapshot.version && (
                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 leading-3 mt-1">
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

              {/* Device Status Table */}
              <div ref={deviceTablePreviousRef}>
                <DeviceStatusTable
                  devices={previousDevices}
                  metrics={previousMetrics || metrics}
                  currentSnapshot={previousSnapshot}
                  loading={loading || loadingBatch < 5}
                  initialSearchTerm={selectedDevicePrevious}
                  onSearchChange={(term) => {
                    if (!term) setSelectedDevicePrevious('')
                  }}
                />
              </div>
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

export default function DevicesPage() {
  return (
    <Suspense fallback={<DevicesPageSkeleton />}>
      <DevicesPageContent />
    </Suspense>
  )
}

function DevicesPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-full max-w-3xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
