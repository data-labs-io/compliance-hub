'use client'

import { useState } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface DeviceLoadErrorAlertProps {
  expectedDeviceCount?: number
  className?: string
}

/**
 * Alert banner displayed when device loading fails.
 * Shows when devices.length === 0 but snapshot.totalDeviceCount > 0,
 * indicating an API error (version mismatch, auth, connectivity, etc.)
 */
export function DeviceLoadErrorAlert({ expectedDeviceCount, className = '' }: DeviceLoadErrorAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  return (
    <Alert
      variant="destructive"
      className={`relative border-2 border-red-400 dark:border-red-600 ${className}`}
    >
      <AlertTriangle className="h-5 w-5" />

      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-md hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
        aria-label="Dismiss alert"
      >
        <X className="h-4 w-4" />
      </button>

      <AlertTitle className="text-lg font-semibold pr-8">
        Unable to Load Device Data
      </AlertTitle>

      <AlertDescription className="mt-3">
        <p className="mb-4 text-sm">
          The dashboard is showing 0 devices
          {expectedDeviceCount ? `, but the snapshot indicates ${expectedDeviceCount.toLocaleString()} devices were discovered` : ''}.
          This may indicate a connectivity issue with your IP Fabric instance.
        </p>

        <div className="mb-4">
          <p className="font-semibold text-sm mb-2">Possible causes:</p>
          <ul className="list-disc list-inside space-y-1 text-sm ml-1">
            <li>API version incompatibility with your IP Fabric instance</li>
            <li>Network connectivity issues between the dashboard and IP Fabric</li>
            <li>Insufficient API token permissions</li>
            <li>IP Fabric instance temporarily unavailable</li>
          </ul>
        </div>

        <div className="mb-4">
          <p className="font-semibold text-sm mb-2">Recommended steps:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm ml-1">
            <li>Refresh the page and try again</li>
            <li>Verify your IP Fabric instance is accessible</li>
            <li>Check that your API token has the required permissions</li>
            <li>Contact IP Fabric support if the issue persists</li>
          </ol>
        </div>

        <div className="flex gap-3 mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4 mr-1.5" />
            Dismiss
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh Page
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
