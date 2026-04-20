// NIS2 Directive Type Definitions
// Framework: EU NIS2 Directive (DIRECTIVE (EU) 2022/2555)
// 2 Chapters, 2 Articles: Article 21 (Cybersecurity Risk-management) + Article 27 (Registry of Entities)
// Total: 200 points max (185 for Article 21 + 15 for Article 27)

export interface NIS2CheckDetail {
  id: string                              // e.g., '21.2.B-devices', '27.2.F-ipv4routes'
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

export interface NIS2Article {
  id: string                              // '21.2.B', '21.2.C', '21.2.D', '21.2.E', '21.2.F', '21.2.H', '21.2.I', '27.2.F'
  name: string
  score: number
  maxScore: number
  status: 'pass' | 'warning'             // No 'fail' - cap at warning per design philosophy
  loading?: boolean
  details?: NIS2CheckDetail[]
}

export interface NIS2Metrics {
  totalDevices: number
  totalSites: number

  // ============================================
  // 21.2.B: INCIDENT HANDLING Metrics
  // ============================================

  // Device inventory
  deviceCount: number
  deviceCountAvailable: boolean
  deviceCountReason?: string

  // Site inventory
  siteCount: number | null
  siteCountAvailable: boolean
  siteCountReason?: string

  // NTP configured and synchronised
  ntpPercent: number | null
  ntpAvailable: boolean
  ntpReason?: string

  // IPv4 addresses in DNS (forward + reverse)
  ipv4DnsCoveragePercent: number | null
  ipv4DnsCoverageAvailable: boolean
  ipv4DnsCoverageReason?: string

  // DNS resolvers or caches configured
  dnsServersCount: number | null
  dnsServersAvailable: boolean
  dnsServersReason?: string

  // Local Logging
  localLoggingPercent: number | null
  localLoggingAvailable: boolean
  localLoggingReason?: string

  // Remote Logging
  remoteLoggingPercent: number | null
  remoteLoggingAvailable: boolean
  remoteLoggingReason?: string

  // Device Configuration Management
  configurationCount: number | null
  configurationCountAvailable: boolean
  configurationCountReason?: string

  // ACL Policies count (active)
  aclPolicyCount: number | null
  aclPolicyCountAvailable: boolean
  aclPolicyCountReason?: string

  // Zone Firewall Policies count (active)
  zoneFwPolicyCount: number | null
  zoneFwPolicyCountAvailable: boolean
  zoneFwPolicyCountReason?: string

  // eBGP Neighbours
  ebgpNeighborsCount: number | null
  ebgpNeighborsAvailable: boolean
  ebgpNeighborsReason?: string

  // Diagram availability
  diagramAvailable: boolean
  diagramReason?: string

  // ============================================
  // 21.2.C: BUSINESS CONTINUITY Metrics
  // ============================================

  // Discovery Issues
  discoveryIssues: number
  discoveryIssuesAvailable: boolean
  discoveryIssuesReason?: string

  // Unique platform/family types
  uniquePlatforms: number | null
  uniquePlatformsAvailable: boolean
  uniquePlatformsReason?: string

  // ============================================
  // 21.2.E: VULNERABILITY HANDLING Metrics
  // ============================================

  // End of Support percentage
  endOfSupportPercent: number | null
  endOfSupportAvailable: boolean
  endOfSupportReason?: string

  // ============================================
  // 21.2.F: RISK MANAGEMENT ASSESSMENT Metrics
  // ============================================

  // TACACS/RADIUS percentage
  aaaPercent: number | null
  aaaAvailable: boolean
  aaaReason?: string

  // Telnet enabled percentage
  telnetPercent: number | null
  telnetAvailable: boolean
  telnetReason?: string

  // ACL ANY/ANY count
  anyAnyAclCount: number | null
  anyAnyAclAvailable: boolean
  anyAnyAclReason?: string

  // FW ANY/ANY count
  anyAnyFwCount: number | null
  anyAnyFwAvailable: boolean
  anyAnyFwReason?: string

  // ============================================
  // 21.2.H: CRYPTOGRAPHY Metrics
  // ============================================

  // 802.1x percentage
  securePortsPercent: number | null
  securePortsAvailable: boolean
  securePortsReason?: string

  // ============================================
  // 27.2.F: ENTITY IP RANGES Metrics
  // ============================================

  // IPv4 Routing Tables count
  ipv4RoutesCount: number | null
  ipv4RoutesAvailable: boolean
  ipv4RoutesReason?: string

  // IPv6 Routing Tables count
  ipv6RoutesCount: number | null
  ipv6RoutesAvailable: boolean
  ipv6RoutesReason?: string

  // ============================================
  // Previous Metrics for Delta Calculation
  // ============================================
  previousMetrics?: NIS2PreviousMetrics
}

export interface NIS2PreviousMetrics {
  totalDevices?: number
  siteCount?: number | null
  ntpPercent?: number | null
  ipv4DnsCoveragePercent?: number | null
  dnsServersCount?: number | null
  localLoggingPercent?: number | null
  remoteLoggingPercent?: number | null
  configurationCount?: number | null
  aclPolicyCount?: number | null
  zoneFwPolicyCount?: number | null
  ebgpNeighborsCount?: number | null
  discoveryIssues?: number
  uniquePlatforms?: number | null
  endOfSupportPercent?: number | null
  aaaPercent?: number | null
  telnetPercent?: number | null
  anyAnyAclCount?: number | null
  anyAnyFwCount?: number | null
  securePortsPercent?: number | null
  ipv4RoutesCount?: number | null
  ipv6RoutesCount?: number | null
}
