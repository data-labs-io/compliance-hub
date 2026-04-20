// CIS Controls v8.1 Type Definitions

export interface CISControlDetail {
  id: string
  name: string
  ipFabricContext: string
  maxPoints: number
  currentValue?: number | string
  previousValue?: number | string
  delta?: number | string
  deltaDirection?: 'positive' | 'negative' | 'neutral'
  calculatedPoints: number
  scoringRule: string
  unavailabilityReason?: string
  // UX Warning: Indicates this delta-based control needs a comparative snapshot for accurate scoring
  requiresComparativeSnapshot?: boolean
  breakdown?: Array<{
    metric: string
    value: number | string
    points: number
    rule: string
    previousValue?: number | string
    delta?: number | string
  }>
}

export interface CISControl {
  id: string
  name: string
  score: number
  maxScore: number
  status: 'pass' | 'warning' | 'fail'
  loading?: boolean
  details?: CISControlDetail[]
}

export interface CISMetrics {
  totalDevices: number

  // Control 1 metrics with availability tracking
  discoveryIssues: number
  siteCount: number | null
  siteCountAvailable: boolean
  siteCountReason?: string
  uniquePlatforms: number | null
  uniquePlatformsAvailable: boolean
  uniquePlatformsReason?: string
  intentChecksPassed: number
  intentChecksFailed: number

  // Control 2 metrics (versionVariance and endOfSupport use existing null patterns)
  versionVariance: number
  endOfSupportDevices: number

  // Control 3 metrics with availability tracking
  anyAnyAclCount: number | null
  anyAnyAclAvailable: boolean
  anyAnyAclReason?: string

  dnsCoveragePercent: number | null
  dnsCoverageAvailable: boolean
  dnsCoverageReason?: string

  telnetPercent: number | null
  telnetAvailable: boolean
  telnetReason?: string

  remoteLoggingPercent: number | null
  remoteLoggingAvailable: boolean
  remoteLoggingReason?: string

  aaaPercent: number | null
  aaaAvailable: boolean
  aaaReason?: string

  // Control 4 metrics with availability tracking
  localAaaUsersPercent: number | null
  localAaaUsersAvailable: boolean
  localAaaUsersReason?: string
  dnsServersCount: number | null
  dnsServersAvailable: boolean
  dnsServersReason?: string

  // Control 8 metrics with availability tracking
  localLoggingPercent: number | null
  localLoggingAvailable: boolean
  localLoggingReason?: string
  ntpPercent: number | null
  ntpAvailable: boolean
  ntpReason?: string

  // Control 13 metrics with availability tracking
  zoneFirewallCount: number | null
  zoneFirewallAvailable: boolean
  zoneFirewallReason?: string
  flowCollectionCount: number | null
  flowCollectionAvailable: boolean
  flowCollectionReason?: string
  port8021xPercent: number | null
  port8021xAvailable: boolean
  port8021xReason?: string

  // Control 17 metrics with availability tracking
  routesCount: number | null
  routesAvailable: boolean
  routesReason?: string
  unstableRoutesCount: number | null
  unstableRoutesAvailable: boolean
  unstableRoutesReason?: string
  errDisabledPercent: number | null
  errDisabledAvailable: boolean
  errDisabledReason?: string
  pathLookupAvailable: boolean
  pathLookupCheckCount?: number
  pathLookupUnavailableReason?: string
  pathLookupMethod?: 'path-checks' | 'graph-api'

  // Optional previous snapshot metrics for delta calculation
  previousMetrics?: {
    totalDevices?: number
    discoveryIssues?: number
    siteCount?: number | null
    siteCountAvailable?: boolean
    uniquePlatforms?: number | null
    uniquePlatformsAvailable?: boolean
    intentChecksPassed?: number
    intentChecksFailed?: number
    versionVariance?: number
    endOfSupportDevices?: number
    anyAnyAclCount?: number | null
    anyAnyAclAvailable?: boolean
    dnsCoveragePercent?: number | null
    dnsCoverageAvailable?: boolean
    telnetPercent?: number | null
    telnetAvailable?: boolean
    remoteLoggingPercent?: number | null
    remoteLoggingAvailable?: boolean
    aaaPercent?: number | null
    aaaAvailable?: boolean
    localAaaUsersPercent?: number | null
    localAaaUsersAvailable?: boolean
    dnsServersCount?: number | null
    dnsServersAvailable?: boolean
    localLoggingPercent?: number | null
    localLoggingAvailable?: boolean
    ntpPercent?: number | null
    ntpAvailable?: boolean
    zoneFirewallCount?: number | null
    zoneFirewallAvailable?: boolean
    flowCollectionCount?: number | null
    flowCollectionAvailable?: boolean
    port8021xPercent?: number | null
    port8021xAvailable?: boolean
    routesCount?: number | null
    routesAvailable?: boolean
    unstableRoutesCount?: number | null
    unstableRoutesAvailable?: boolean
    errDisabledPercent?: number | null
    errDisabledAvailable?: boolean
    pathLookupAvailable?: boolean
    pathLookupCheckCount?: number
  }
}
