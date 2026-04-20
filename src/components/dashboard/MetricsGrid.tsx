'use client'

// Updated MetricsGrid with snapshot-aware functionality
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import {
  Server,
  Shield,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  XCircle,
  Database,
  Loader2
} from 'lucide-react'
import { cn, formatNumber, formatPercentage } from '@/lib/utils'
import { DashboardMetrics } from '@/stores/dashboard-store'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color: 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'orange'
  progress?: number
  progressVariant?: 'default' | 'ghost'  // ghost = muted/reference style for baseline
  invertTrendColors?: boolean
  onClick?: () => void
  tooltipContent?: string | React.ReactNode
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color,
  progress,
  progressVariant = 'default',
  invertTrendColors = false,
  onClick,
  tooltipContent
}: MetricCardProps) {
  const { isColorBlindMode } = useColorBlindMode()

  // Colorblind mode: use accessible colors for status-indicating accent bars
  // Dark mode: monochromatic blue theme for harmony with blue gradient background
  const colorClasses = {
    green: isColorBlindMode ? 'bg-accessible-success' : 'bg-green-500 dark:bg-blue-400',
    blue: 'bg-sky-500 dark:bg-blue-500',
    red: isColorBlindMode ? 'bg-accessible-error' : 'bg-red-500 dark:bg-blue-400',
    yellow: isColorBlindMode ? 'bg-accessible-warning' : 'bg-yellow-500 dark:bg-blue-400',
    purple: 'bg-purple-500 dark:bg-blue-400',
    orange: isColorBlindMode ? 'bg-accessible-error' : 'bg-orange-500 dark:bg-blue-400',
  }

  // Icon colors: desaturated for dark mode
  const iconColorClasses = {
    green: 'text-green-500 dark:text-green-400',
    blue: 'text-sky-500 dark:text-sky-400',
    red: 'text-red-500 dark:text-red-400',
    yellow: 'text-yellow-500 dark:text-yellow-400',
    purple: 'text-purple-500 dark:text-purple-400',
    orange: 'text-orange-500 dark:text-orange-400',
  }

  const trendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  }

  const TrendIcon = trend ? trendIcon[trend] : null

  // Determine if this trend is "good" or "bad" for colorblind mode icons
  const isGoodTrend = trend && (
    (trend === 'up' && !invertTrendColors) ||
    (trend === 'down' && invertTrendColors)
  )
  const isBadTrend = trend && (
    (trend === 'up' && invertTrendColors) ||
    (trend === 'down' && !invertTrendColors)
  )

  return (
    <Card
      className={cn(
        "relative metric-card h-[180px] flex flex-col",
        "dark:border-blue-800/30 dark:bg-blue-900/20",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-h-[40px]">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</CardTitle>
            {tooltipContent && (
              <InfoTooltip
                content={tooltipContent}
                variant="help"
                iconClassName="h-3.5 w-3.5 text-gray-400 dark:text-gray-500"
              />
            )}
          </div>
          <div className={cn('rounded-lg p-2', `${colorClasses[color]} bg-opacity-10 dark:bg-opacity-20`)}>
            <Icon className={cn('h-5 w-5', iconColorClasses[color])} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-bold dark:text-gray-100">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 min-h-[16px]">{subtitle || '\u00A0'}</p>
          </div>
          {/* Always reserve space for trend area to ensure consistent card heights */}
          <div className="min-h-[20px] flex items-center">
          {trend && TrendIcon && (
            <div className="flex items-center gap-1">
              {/* Colorblind mode: show status icons */}
              {isColorBlindMode && trend !== 'neutral' && (
                isGoodTrend
                  ? <CheckCircle2 className="h-3 w-3 text-accessible-success" />
                  : <XCircle className="h-3 w-3 text-accessible-error" />
              )}
              <TrendIcon
                className={cn(
                  'h-4 w-4',
                  trend === 'up' && (invertTrendColors
                    ? (isColorBlindMode ? 'text-accessible-error' : 'text-red-500')
                    : (isColorBlindMode ? 'text-accessible-success' : 'text-green-500')),
                  trend === 'down' && (invertTrendColors
                    ? (isColorBlindMode ? 'text-accessible-success' : 'text-green-500 dark:text-green-400')
                    : (isColorBlindMode ? 'text-accessible-error' : 'text-red-500 dark:text-red-400')),
                  trend === 'neutral' && 'text-gray-400 dark:text-gray-500'
                )}
              />
              {trendValue && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend === 'up' && (invertTrendColors
                      ? (isColorBlindMode ? 'text-accessible-error' : 'text-red-600 dark:text-red-400')
                      : (isColorBlindMode ? 'text-accessible-success' : 'text-green-600 dark:text-green-400')),
                    trend === 'down' && (invertTrendColors
                      ? (isColorBlindMode ? 'text-accessible-success' : 'text-green-600 dark:text-green-400')
                      : (isColorBlindMode ? 'text-accessible-error' : 'text-red-600 dark:text-red-400')),
                    trend === 'neutral' && 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {trendValue}
                </span>
              )}
            </div>
          )}
          </div>
        </div>
        {progress !== undefined && (
          <div className="mt-3">
            <Progress
              value={progress}
              className={cn(
                "h-1.5",
                progressVariant === 'ghost' && "[&>div]:bg-gray-400 dark:[&>div]:bg-gray-500",
                isColorBlindMode && progressVariant !== 'ghost' && "[&>div]:bg-accessible-success"
              )}
            />
          </div>
        )}
      </CardContent>
      {/* Gradient accent - positioned absolutely at bottom */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 h-1 rounded-b-lg',
          colorClasses[color]
        )}
      />
    </Card>
  )
}

interface MetricsGridProps {
  metrics: DashboardMetrics
  previousMetrics?: DashboardMetrics | null
  currentSnapshot?: any
  loading?: boolean
  onTotalDevicesClick?: () => void
  onComplianceScoreClick?: () => void
  onIntentChecksClick?: () => void
  onActiveAlertsClick?: () => void
  isPreviousSnapshotView?: boolean  // Indicates this is the baseline view (hide scores)
  controlCount?: number  // Number of controls/requirements for baseline view
  metricsCount?: number  // Number of metrics (details) for baseline view
  currentComplianceScore?: number  // Current snapshot's score for ghost bar in baseline view
  selectedFramework?: 'cis-v8' | 'pci-dss' | 'nist' | 'nis2' | string  // Drives Analysis Score subtitle
}

export function MetricsGrid({
  metrics,
  previousMetrics,
  currentSnapshot,
  loading = false,
  onTotalDevicesClick,
  onComplianceScoreClick,
  onIntentChecksClick,
  onActiveAlertsClick,
  isPreviousSnapshotView = false,
  controlCount = 0,
  metricsCount = 0,
  currentComplianceScore,
  selectedFramework = 'cis-v8'
}: MetricsGridProps) {

  // Framework-aware subtitle for the Analysis Score card.
  // Keeps the CIS wording for CIS, so no visual regression for the existing framework.
  const frameworkSubtitle =
    selectedFramework === 'nist'    ? 'NIST CSF'
    : selectedFramework === 'pci-dss' ? 'PCI-DSS v4'
    : selectedFramework === 'nis2'    ? 'NIS2 (EU 2022/2555)'
    : 'CIS Controls v8'

  const compliancePercentage = metrics.complianceScore
  const intentPassRate =
    metrics.intentChecksPassed + metrics.intentChecksFailed > 0
      ? (metrics.intentChecksPassed / (metrics.intentChecksPassed + metrics.intentChecksFailed)) * 100
      : 0

  // Calculate trends based on comparison with previous snapshot
  const calculateTrend = (current: number, previous: number | undefined) => {
    if (!previous || previous === current) return 'neutral'
    return current > previous ? 'up' : 'down'
  }

  const calculateTrendValue = (current: number, previous: number | undefined, isPercentage = false) => {
    if (!previous) return undefined
    const diff = current - previous
    if (diff === 0) return '0'
    const sign = diff > 0 ? '+' : ''
    return isPercentage ? `${sign}${diff.toFixed(1)}%` : `${sign}${diff}`
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="relative overflow-hidden dark:border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {currentSnapshot && (
            <div className="flex items-center justify-between text-xs min-h-[60px]">
              <div className="text-gray-500 dark:text-gray-400">
                <div>
                  Data from: {currentSnapshot.displayName} • {new Date(currentSnapshot.createdAt).toLocaleDateString()}
                </div>
                <div className="text-gray-400 dark:text-gray-500 mt-1 min-h-[16px]">
                  {previousMetrics && (
                    <>Comparing with previous snapshot for trend analysis</>
                  )}
                </div>
              </div>
              <div className="text-right text-gray-500 dark:text-gray-400">
                <div className="font-medium">
                  Viewing Snapshot
                </div>
                <div className="mt-1">
              {currentSnapshot.displayName}
            </div>
            <div className="text-gray-400 dark:text-gray-500">
              {new Date(currentSnapshot.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Devices"
          value={formatNumber(metrics.totalDevices)}
          subtitle="Across all sites"
          icon={Server}
          trend={previousMetrics ? calculateTrend(metrics.totalDevices, previousMetrics.totalDevices) : 'neutral'}
          trendValue={previousMetrics ? calculateTrendValue(metrics.totalDevices, previousMetrics.totalDevices) : undefined}
          color="blue"
          onClick={onTotalDevicesClick}
          tooltipContent={
            <div className="space-y-1">
              <p>Total network infrastructure devices discovered and managed by IP Fabric.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Source: /tables/inventory/devices</p>
            </div>
          }
        />

        {isPreviousSnapshotView ? (
          /* Baseline Data card for previous snapshot view */
          <MetricCard
            title="Baseline Data"
            value={`${controlCount} controls`}
            subtitle={`${metricsCount} metrics`}
            icon={Database}
            color="green"
            progress={currentComplianceScore}
            progressVariant="ghost"
            onClick={onComplianceScoreClick}
            tooltipContent={
              <div className="space-y-1">
                <p>This snapshot provides baseline metrics for delta calculations.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">The progress bar shows the current snapshot score for visual comparison.</p>
              </div>
            }
          />
        ) : (
          /* Analysis Score card for current snapshot view */
          <MetricCard
            title="Analysis Score"
            value={formatPercentage(compliancePercentage)}
            subtitle={frameworkSubtitle}
            icon={Shield}
            trend={previousMetrics ? calculateTrend(compliancePercentage, previousMetrics.complianceScore) : 'neutral'}
            trendValue={previousMetrics ? calculateTrendValue(compliancePercentage, previousMetrics.complianceScore, true) : undefined}
            color="green"
            progress={compliancePercentage}
            onClick={onComplianceScoreClick}
            tooltipContent={
              <div className="space-y-1">
                <p>Overall analysis score based on applicable framework controls.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Calculated from control scores using framework-specific weighting.</p>
              </div>
            }
          />
        )}

        <MetricCard
          title="Intent Checks"
          value={(metrics as any).intentChecksAvailable === false
            ? "API Unavailable"
            : `${metrics.intentChecksPassed}/${metrics.intentChecksPassed + metrics.intentChecksFailed}`}
          subtitle={(metrics as any).intentChecksAvailable === false
            ? "Unable to fetch data"
            : `${formatPercentage(intentPassRate)} pass rate`}
          icon={CheckCircle2}
          trend={(metrics as any).intentChecksAvailable === false ? 'neutral' :
            previousMetrics ?
            calculateTrend(
              metrics.intentChecksPassed,
              previousMetrics.intentChecksPassed
            ) : 'neutral'}
          trendValue={(metrics as any).intentChecksAvailable === false ? undefined :
            previousMetrics ?
            `${calculateTrendValue(metrics.intentChecksPassed, previousMetrics.intentChecksPassed)} passed` : undefined}
          color={(metrics as any).intentChecksAvailable === false ? "purple" : "purple"}
          progress={(metrics as any).intentChecksAvailable === false ? undefined : intentPassRate}
          onClick={onIntentChecksClick}
          tooltipContent={
            <div className="space-y-1">
              <p>Intent verification reports assess network compliance across routing, security, QoS, and infrastructure.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Source: GET /api/v7.3/reports</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Reports evaluate BGP, OSPF, ACLs, AAA, lifecycle management, and 80+ other categories.</p>
            </div>
          }
        />

{/* Active Alerts card hidden - uncomment to restore
        <MetricCard
          title="Active Alerts"
          value={metrics.activeAlerts}
          subtitle="Requires attention"
          icon={AlertTriangle}
          trend={previousMetrics ?
            // For alerts, down arrow is good (fewer alerts), up arrow is bad (more alerts)
            metrics.activeAlerts < previousMetrics.activeAlerts ? 'down' :
            metrics.activeAlerts > previousMetrics.activeAlerts ? 'up' : 'neutral'
            : 'neutral'}
          trendValue={previousMetrics ?
            calculateTrendValue(metrics.activeAlerts, previousMetrics.activeAlerts) : undefined}
          color={metrics.activeAlerts > 0 ? 'orange' : 'yellow'}
          invertTrendColors={true}
          onClick={onActiveAlertsClick}
          tooltipContent={
            <div className="space-y-1">
              <p>Analysis-focused alerts including low analysis scores, failed CIS controls, high intent check failures, and offline devices.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Alerts are prioritized by severity: Critical &gt; Warning &gt; Info</p>
            </div>
          }
        />
        */}
      </div>
        </div>
      </CardContent>
    </Card>
  )
}