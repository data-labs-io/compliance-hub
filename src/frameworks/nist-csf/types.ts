// NIST CSF v2.0 Type Definitions
// Framework: NIST Cybersecurity Framework v2.0
// 6 Core Functions: Govern, Identify, Protect, Detect, Respond, Recover

export interface NISTCSFSubcategoryDetail {
  id: string                              // e.g., 'GV.RM-1', 'ID.AM-1'
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
  // UX Warning: Indicates this delta-based check needs a comparative snapshot for accurate scoring
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

export interface NISTCSFFunction {
  id: string                              // 'GV', 'ID', 'PR', 'DE', 'RS', 'RC'
  name: string                            // 'Govern', 'Identify', etc.
  score: number                           // 0-5 points
  maxScore: number                        // Always 5 for NIST CSF
  status: 'pass' | 'warning'              // No 'fail' - cap at warning per design philosophy
  loading?: boolean
  details?: NISTCSFSubcategoryDetail[]
}

export interface NISTCSFMetrics {
  totalDevices: number
  totalSites: number

  // ============================================
  // GV: GOVERN Function Metrics
  // ============================================

  // GV.RM-1: Intent Checks (Risk Management Objectives)
  intentChecksPassed: number
  intentChecksFailed: number
  intentChecksTotal: number

  // GV.OV-03: Discovery Issues (Risk Management Performance)
  discoveryIssues: number
  discoveryIssuesAvailable: boolean
  discoveryIssuesReason?: string

  // ============================================
  // ID: IDENTIFY Function Metrics
  // ============================================

  // ID.AM-1: Device & Site Inventory
  deviceCount: number
  deviceCountAvailable: boolean
  deviceCountReason?: string
  siteCount: number | null
  siteCountAvailable: boolean
  siteCountReason?: string

  // ID.AM-1 Extended: Devices by Vendor (for breakdown)
  devicesByVendor?: Record<string, number>

  // ID.AM-2: Software/Platform Inventory
  uniquePlatforms: number | null
  uniquePlatformsAvailable: boolean
  uniquePlatformsReason?: string

  // ID.AM-2: Version Variance (highest across all NOS families)
  versionVariance: number | null
  versionVarianceAvailable: boolean
  versionVarianceReason?: string
  versionVarianceFamily?: string          // e.g., 'Cisco IOS', 'Arista EOS'

  // ID.AM-3: IPv4 Addresses in DNS
  ipv4DnsCoveragePercent: number | null
  ipv4DnsCoverageAvailable: boolean
  ipv4DnsCoverageReason?: string

  // ID.AM-3: IPv6 Addresses Configured (excl. fe80)
  ipv6ConfiguredPercent: number | null
  ipv6ConfiguredAvailable: boolean
  ipv6ConfiguredReason?: string

  // ID.AM-3: Path Lookup Capability
  pathLookupAvailable: boolean
  pathLookupReason?: string

  // ============================================
  // PR: PROTECT Function Metrics
  // ============================================

  // PR.AA-01: AAA Servers (TACACS/RADIUS)
  aaaServersPercent: number | null
  aaaServersAvailable: boolean
  aaaServersReason?: string

  // PR.AA-01: Local User Accounts
  localUsersPercent: number | null
  localUsersAvailable: boolean
  localUsersReason?: string

  // PR.PS-02: End of Support Devices
  endOfSupportPercent: number | null
  endOfSupportAvailable: boolean
  endOfSupportReason?: string

  // PR.PS-04: Local Logging
  localLoggingPercent: number | null
  localLoggingAvailable: boolean
  localLoggingReason?: string

  // ============================================
  // DE: DETECT Function Metrics
  // ============================================

  // DE.CM-01: errDisabled Interfaces
  errDisabledPercent: number | null
  errDisabledAvailable: boolean
  errDisabledReason?: string

  // DE.CM-01: Route Stability (routes converged in last 15 mins)
  unstableRoutesCount: number | null
  unstableRoutesAvailable: boolean
  unstableRoutesReason?: string

  // DE.CM-06: eBGP Neighbors
  ebgpNeighborsCount: number | null
  ebgpNeighborsAvailable: boolean
  ebgpNeighborsReason?: string

  // DE.CM-09: Remote Logging
  remoteLoggingPercent: number | null
  remoteLoggingAvailable: boolean
  remoteLoggingReason?: string

  // ============================================
  // RS: RESPOND Function Metrics
  // ============================================

  // RS.MI-01: ACL Policies with ANY/ANY
  anyAnyAclCount: number | null
  anyAnyAclAvailable: boolean
  anyAnyAclReason?: string

  // ============================================
  // RC: RECOVER Function Metrics
  // ============================================

  // RC.RP-05: IPv4 Route Count
  ipv4RoutesCount: number | null
  ipv4RoutesAvailable: boolean
  ipv4RoutesReason?: string

  // RC.RP-05: IPv6 Route Count
  ipv6RoutesCount: number | null
  ipv6RoutesAvailable: boolean
  ipv6RoutesReason?: string

  // RC.RP-05: Saved Config Consistency (devices with changed configs)
  configChangedCount: number | null
  configChangedAvailable: boolean
  configChangedReason?: string

  // ============================================
  // Previous Snapshot Metrics (for delta calculations)
  // ============================================
  previousMetrics?: {
    totalDevices?: number
    totalSites?: number

    // GV metrics
    intentChecksPassed?: number
    intentChecksFailed?: number
    intentChecksTotal?: number
    discoveryIssues?: number

    // ID metrics
    deviceCount?: number
    siteCount?: number | null
    uniquePlatforms?: number | null
    versionVariance?: number | null
    ipv4DnsCoveragePercent?: number | null
    ipv6ConfiguredPercent?: number | null

    // PR metrics
    aaaServersPercent?: number | null
    localUsersPercent?: number | null
    endOfSupportPercent?: number | null
    localLoggingPercent?: number | null

    // DE metrics
    errDisabledPercent?: number | null
    unstableRoutesCount?: number | null
    ebgpNeighborsCount?: number | null
    remoteLoggingPercent?: number | null

    // RS metrics
    anyAnyAclCount?: number | null

    // RC metrics
    ipv4RoutesCount?: number | null
    ipv6RoutesCount?: number | null
    configChangedCount?: number | null
  }
}

// Utility type for metric availability tracking
export interface MetricAvailability {
  value: number | string | null
  available: boolean
  reason?: string
}

// Function scoring result type
export interface FunctionScoreResult {
  score: number
  maxScore: number
  status: 'pass' | 'warning'
  details: NISTCSFSubcategoryDetail[]
}
