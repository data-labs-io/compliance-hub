'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useIPFabricAPI } from '@/hooks/useIPFabricAPI'
import { useSnapshotContext } from '@/contexts/SnapshotContext'
import { Loader2, Database, Calendar } from 'lucide-react'

export function SnapshotAwareDemo() {
  const { selectedSnapshot, getCurrentSnapshot } = useSnapshotContext()

  // Example of using snapshot-aware API calls
  const { data: deviceData, loading, error } = useIPFabricAPI('tables/inventory/devices', {
    method: 'POST',
    body: {
      columns: ['hostname', 'siteName', 'vendor', 'platform', 'version'],
      pagination: { limit: 5, start: 0 },
      sort: { order: 'asc', column: 'hostname' }
    }
  })

  const currentSnapshot = getCurrentSnapshot()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Snapshot-Aware Data Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading snapshot data...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Snapshot-Aware Data Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 py-4">
            Error loading data: {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Snapshot-Aware Data Demo
        </CardTitle>
        {currentSnapshot && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            Data from: {currentSnapshot.name === currentSnapshot.id ?
              (currentSnapshot.id === '$last' ? 'Latest Network State' : currentSnapshot.id) :
              currentSnapshot.name
            }
            <span className="text-xs text-gray-400">
              ({new Date(currentSnapshot.createdAt).toLocaleDateString()})
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">Snapshot Status</h4>
            <div className="text-sm space-y-1">
              <p><strong>Selected Snapshot ID:</strong> <span className="font-mono bg-gray-100 px-1 rounded">{selectedSnapshot}</span></p>
              <p><strong>API Call Made To:</strong> <span className="text-xs font-mono">/api/ipfabric/proxy/tables/inventory/devices?snapshotId={selectedSnapshot}</span></p>
              <p><strong>Last API Call:</strong> <span className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</span></p>
              {currentSnapshot && (
                <p><strong>Snapshot Name:</strong> <span className="font-mono bg-blue-100 px-1 rounded">
                  {currentSnapshot.name === currentSnapshot.id ?
                    (currentSnapshot.id === '$last' ? 'Latest Network State' : currentSnapshot.id) :
                    currentSnapshot.name
                  }
                </span></p>
              )}
            </div>
          </div>

          {deviceData?.data ? (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Devices from this snapshot:</h4>
              <div className="space-y-2">
                {deviceData.data.slice(0, 3).map((device: any, index: number) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="font-medium">{device.hostname || 'Unknown Host'}</div>
                    <div className="text-gray-600">
                      {device.vendor} {device.platform} • Site: {device.siteName || 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Showing 3 of {deviceData.data.length} devices from snapshot
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded text-sm text-gray-600">
              Demo mode: API data will appear here when connected to real IP Fabric instance
            </div>
          )}

          <div className="p-3 bg-blue-50 rounded text-sm">
            <p className="font-medium text-blue-800">How it works:</p>
            <p className="text-blue-700 mt-1">
              This component automatically includes the selected snapshot ID in all API calls.
              When you change snapshots in the sidebar, this data will refresh to show the network state from that snapshot.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}