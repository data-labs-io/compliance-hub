'use client'

import { useMemo } from 'react'
import { useSnapshotAwareDashboard } from '@/hooks/useSnapshotAwareDashboard'
import { useSnapshotContext } from '@/contexts/SnapshotContext'
import { useDashboardStore } from '@/stores/dashboard-store'
import { generateComplianceAlerts } from '@/lib/alerts-calculator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

export default function AlertsPage() {
  const { filteredSnapshots } = useSnapshotContext()

  // Get comparison snapshot selection and framework from global store (persists across pages)
  const { selectedComparisonSnapshot, selectedFramework } = useDashboardStore()

  const {
    metrics,
    previousMetrics,
    loading,
    currentSnapshot,
    previousSnapshot,
    devices,
    cisControls,
    previousDevices,
    previousCisControls,
    pciDssRequirements,
    previousPciDssRequirements,
    nistFunctions,
    previousNistFunctions,
    nis2Articles,
    previousNIS2Articles,
  } = useSnapshotAwareDashboard(selectedComparisonSnapshot)

  // Get framework-appropriate controls
  const currentControls = selectedFramework === 'nis2'
    ? nis2Articles
    : selectedFramework === 'nist'
      ? nistFunctions
      : selectedFramework === 'pci-dss'
        ? pciDssRequirements
        : cisControls

  const previousControlsForFramework = selectedFramework === 'nis2'
    ? previousNIS2Articles
    : selectedFramework === 'nist'
      ? previousNistFunctions
      : selectedFramework === 'pci-dss'
        ? previousPciDssRequirements
        : previousCisControls

  // Map framework to alert-calculator framework ID
  const alertFramework = selectedFramework === 'nis2' ? 'nis2'
    : selectedFramework === 'nist' ? 'nist-csf'
    : selectedFramework

  // Generate alerts for current snapshot
  const currentAlerts = useMemo(() => {
    if (!metrics || !currentControls) return []
    return generateComplianceAlerts(
      devices,
      metrics.complianceScore,
      metrics.intentChecksFailed,
      metrics.intentChecksPassed,
      currentControls,
      alertFramework
    )
  }, [devices, metrics, currentControls, alertFramework])

  // Generate alerts for previous snapshot
  const previousAlerts = useMemo(() => {
    if (!previousMetrics || !previousControlsForFramework || !previousDevices) return []
    return generateComplianceAlerts(
      previousDevices,
      previousMetrics.complianceScore,
      previousMetrics.intentChecksFailed,
      previousMetrics.intentChecksPassed,
      previousControlsForFramework,
      alertFramework
    )
  }, [previousDevices, previousMetrics, previousControlsForFramework, alertFramework])

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'important':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const styles = {
      important: 'bg-orange-100 text-orange-700 border-orange-300',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      info: 'bg-blue-100 text-blue-700 border-blue-300'
    }
    return (
      <Badge className={cn('capitalize border', styles[severity as keyof typeof styles] || styles.info)}>
        {severity}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Analysis Alerts</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          Active analysis issues requiring attention. Alerts are generated based on framework-specific control scores, intent verification failures, and infrastructure health.
        </p>
      </div>

      {/* Two-column comparison layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Latest Snapshot */}
        <div className="space-y-6">
          {/* Header for Latest Snapshot */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-blue-900">Latest Snapshot</h2>
                {currentSnapshot && (
                  <div className="text-sm text-blue-700 mt-1">
                    {currentSnapshot.name === currentSnapshot.id
                      ? currentSnapshot.id === '$last'
                        ? 'Latest Snapshot'
                        : currentSnapshot.id
                      : currentSnapshot.name}
                    <span className="mx-2">•</span>
                    {new Date(currentSnapshot.createdAt).toLocaleDateString()}
                    <span className="mx-2">•</span>
                    {currentAlerts.length} {currentAlerts.length === 1 ? 'alert' : 'alerts'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-4">
            {currentAlerts.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="text-lg font-medium text-green-900">No Active Alerts</p>
                  <p className="text-sm text-green-700 mt-2">
                    All analysis checks are passing
                  </p>
                </CardContent>
              </Card>
            ) : (
              currentAlerts.map((alert) => (
                <Card key={alert.id} className={cn(
                  'border-2 transition-shadow hover:shadow-lg',
                  alert.severity === 'important' && 'border-orange-300 bg-orange-50/50',
                  alert.severity === 'warning' && 'border-yellow-300 bg-yellow-50/50',
                  alert.severity === 'info' && 'border-blue-300 bg-blue-50/50'
                )}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <CardTitle className="text-lg">{alert.title}</CardTitle>
                          <CardDescription className="mt-2">
                            {alert.description}
                          </CardDescription>
                        </div>
                      </div>
                      {getSeverityBadge(alert.severity)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Current Value</div>
                        <div className="font-semibold text-gray-900">{alert.currentValue}</div>
                      </div>
                      {alert.expectedValue && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Expected Value</div>
                          <div className="font-semibold text-gray-900">{alert.expectedValue}</div>
                        </div>
                      )}
                    </div>

                    {/* Impact */}
                    <div className="p-3 bg-white rounded-lg border">
                      <div className="text-xs font-medium text-gray-700 mb-1">Impact</div>
                      <div className="text-sm text-gray-600">{alert.impact}</div>
                    </div>

                    {/* Recommendation */}
                    <div className={cn(
                      'p-3 rounded-lg border',
                      alert.severity === 'important' && 'bg-orange-50 border-orange-200',
                      alert.severity === 'warning' && 'bg-yellow-50 border-yellow-200',
                      alert.severity === 'info' && 'bg-blue-50 border-blue-200'
                    )}>
                      <div className="text-xs font-medium text-gray-700 mb-1">Recommendation</div>
                      <div className="text-sm text-gray-900">{alert.recommendation}</div>
                    </div>

                    {/* Action Link */}
                    {alert.link && (
                      <Link
                        href={alert.link}
                        className={cn(
                          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                          alert.severity === 'important' && 'bg-orange-600 text-white hover:bg-orange-700',
                          alert.severity === 'warning' && 'bg-yellow-600 text-white hover:bg-yellow-700',
                          alert.severity === 'info' && 'bg-blue-600 text-white hover:bg-blue-700'
                        )}
                      >
                        View Details
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Previous Snapshot */}
        <div className="space-y-6">
          {/* Header for Previous Snapshot */}
          {previousSnapshot ? (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">Previous Snapshot</h2>
                    <div className="text-sm text-gray-700 mt-1">
                      {previousSnapshot.name === previousSnapshot.id
                        ? previousSnapshot.id === '$last'
                          ? 'Latest Snapshot'
                          : previousSnapshot.id
                        : previousSnapshot.name}
                      <span className="mx-2">•</span>
                      {new Date(previousSnapshot.createdAt).toLocaleDateString()}
                      <span className="mx-2">•</span>
                      {previousAlerts.length} {previousAlerts.length === 1 ? 'alert' : 'alerts'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerts List */}
              <div className="space-y-4">
                {previousAlerts.length === 0 ? (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="py-12 text-center">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <p className="text-lg font-medium text-green-900">No Active Alerts</p>
                      <p className="text-sm text-green-700 mt-2">
                        All analysis checks are passing
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  previousAlerts.map((alert) => (
                    <Card key={alert.id} className={cn(
                      'border-2 transition-shadow hover:shadow-lg',
                      alert.severity === 'important' && 'border-orange-300 bg-orange-50/50',
                      alert.severity === 'warning' && 'border-yellow-300 bg-yellow-50/50',
                      alert.severity === 'info' && 'border-blue-300 bg-blue-50/50'
                    )}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            {getSeverityIcon(alert.severity)}
                            <div className="flex-1">
                              <CardTitle className="text-lg">{alert.title}</CardTitle>
                              <CardDescription className="mt-2">
                                {alert.description}
                              </CardDescription>
                            </div>
                          </div>
                          {getSeverityBadge(alert.severity)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Current Value</div>
                            <div className="font-semibold text-gray-900">{alert.currentValue}</div>
                          </div>
                          {alert.expectedValue && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Expected Value</div>
                              <div className="font-semibold text-gray-900">{alert.expectedValue}</div>
                            </div>
                          )}
                        </div>

                        {/* Impact */}
                        <div className="p-3 bg-white rounded-lg border">
                          <div className="text-xs font-medium text-gray-700 mb-1">Impact</div>
                          <div className="text-sm text-gray-600">{alert.impact}</div>
                        </div>

                        {/* Recommendation */}
                        <div className={cn(
                          'p-3 rounded-lg border',
                          alert.severity === 'important' && 'bg-orange-50 border-orange-200',
                          alert.severity === 'warning' && 'bg-yellow-50 border-yellow-200',
                          alert.severity === 'info' && 'bg-blue-50 border-blue-200'
                        )}>
                          <div className="text-xs font-medium text-gray-700 mb-1">Recommendation</div>
                          <div className="text-sm text-gray-900">{alert.recommendation}</div>
                        </div>

                        {/* Action Link */}
                        {alert.link && (
                          <Link
                            href={alert.link}
                            className={cn(
                              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                              alert.severity === 'important' && 'bg-orange-600 text-white hover:bg-orange-700',
                              alert.severity === 'warning' && 'bg-yellow-600 text-white hover:bg-yellow-700',
                              alert.severity === 'info' && 'bg-blue-600 text-white hover:bg-blue-700'
                            )}
                          >
                            View Details
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
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
