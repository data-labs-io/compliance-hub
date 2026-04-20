// PCI DSS v4.0.1 Type Definitions

export interface PCIDSSSubRequirementDetail {
  id: string                    // '1.2.1', '2.2.4', etc.
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

export interface PCIDSSRequirement {
  id: string                    // '1', '2', '6', '7', '8', '10', '11', '12'
  name: string
  score: number
  maxScore: number
  status: 'pass' | 'warning' | 'fail'
  ragColor?: 'green' | 'amber' | 'red'  // PCI-DSS uses RAG colors
  loading?: boolean
  details?: PCIDSSSubRequirementDetail[]
}

export interface PCIDSSMetrics {
  totalDevices: number
  totalSites: number

  // Requirement 1 metrics (Network Security Controls - 55 points, 11 checks)
  aclPolicyCount: number | null
  aclPolicyCountAvailable: boolean
  aclPolicyCountReason?: string

  zoneFwPolicyCount: number | null
  zoneFwPolicyCountAvailable: boolean
  zoneFwPolicyCountReason?: string

  anyAnyAclCount: number | null
  anyAnyAclAvailable: boolean
  anyAnyAclReason?: string

  anyAnyFwCount: number | null
  anyAnyFwAvailable: boolean
  anyAnyFwReason?: string

  telnetPercent: number | null
  telnetAvailable: boolean
  telnetReason?: string

  configurationCount: number | null
  configurationCountAvailable: boolean
  configurationCountReason?: string

  bgpNeighborsCount: number | null
  bgpNeighborsAvailable: boolean
  bgpNeighborsReason?: string

  diagramAvailable: boolean
  diagramReason?: string

  // Requirement 2 metrics (Secure Configurations - 35 points, 7 checks)
  endOfSupportPercent: number | null
  endOfSupportAvailable: boolean
  endOfSupportReason?: string

  discoveryIssuesCount: number

  localAaaUsersPercent: number | null
  localAaaUsersAvailable: boolean
  localAaaUsersReason?: string

  aaaAuthPercent: number | null
  aaaAuthAvailable: boolean
  aaaAuthReason?: string

  ntpPercent: number | null
  ntpAvailable: boolean
  ntpReason?: string

  // Requirement 6 metrics (Secure Systems - 5 points, 1 check)
  // Reuses endOfSupportPercent from Requirement 2

  // Requirement 7 metrics (Access Restrictions - 5 points, 1 check)
  // Reuses aaaAuthPercent from Requirement 2

  // Requirement 8 metrics (User Authentication - 15 points, 3 checks)
  // Reuses localAaaUsersPercent, aaaAuthPercent, telnetPercent

  // Requirement 10 metrics (Logging & Monitoring - 15 points, 3 checks)
  localLoggingPercent: number | null
  localLoggingAvailable: boolean
  localLoggingReason?: string

  remoteLoggingPercent: number | null
  remoteLoggingAvailable: boolean
  remoteLoggingReason?: string
  // Reuses ntpPercent

  // Requirement 11 metrics (Security Testing - 5 points, 1 check)
  wirelessAPCount: number | null
  wirelessAPAvailable: boolean
  wirelessAPReason?: string
  wirelessAPNotApplicable?: boolean  // Wired-only network (0 APs = compliant)

  // Requirement 12 metrics (Policy Support - 20 points, 4 checks)
  platformTypesCount: number | null
  platformTypesAvailable: boolean
  platformTypesReason?: string

  osVersionVariance: number

  // Optional previous snapshot metrics for delta calculation
  previousMetrics?: {
    totalDevices?: number
    totalSites?: number

    // Requirement 1 previous
    aclPolicyCount?: number | null
    aclPolicyCountAvailable?: boolean
    zoneFwPolicyCount?: number | null
    zoneFwPolicyCountAvailable?: boolean
    anyAnyAclCount?: number | null
    anyAnyAclAvailable?: boolean
    anyAnyFwCount?: number | null
    anyAnyFwAvailable?: boolean
    telnetPercent?: number | null
    telnetAvailable?: boolean
    configurationCount?: number | null
    configurationCountAvailable?: boolean
    bgpNeighborsCount?: number | null
    bgpNeighborsAvailable?: boolean
    diagramAvailable?: boolean

    // Requirement 2 previous
    endOfSupportPercent?: number | null
    endOfSupportAvailable?: boolean
    discoveryIssuesCount?: number
    localAaaUsersPercent?: number | null
    localAaaUsersAvailable?: boolean
    aaaAuthPercent?: number | null
    aaaAuthAvailable?: boolean
    ntpPercent?: number | null
    ntpAvailable?: boolean

    // Requirement 10 previous
    localLoggingPercent?: number | null
    localLoggingAvailable?: boolean
    remoteLoggingPercent?: number | null
    remoteLoggingAvailable?: boolean

    // Requirement 11 previous
    wirelessAPCount?: number | null
    wirelessAPAvailable?: boolean
    wirelessAPNotApplicable?: boolean

    // Requirement 12 previous
    platformTypesCount?: number | null
    platformTypesAvailable?: boolean
    osVersionVariance?: number
  }
}
