/**
 * Test fixtures for compliance calculator tests
 * Provides mock data for PCIDSSMetrics, CISMetrics, and Device arrays
 */

import type { PCIDSSMetrics, PCIDSSRequirement } from '../pci-dss/types'
import type { CISMetrics, CISControl } from '../cis/types'
import type { Device } from '@/lib/device-generator'

// =============================================================================
// DEVICE FIXTURES
// =============================================================================

export const mockDevices: Device[] = [
  {
    id: 'dev-001',
    hostname: 'router-01',
    ip: '10.0.0.1',
    sn: 'SN001',
    loginIp: '10.0.0.1',
    loginType: 'ssh',
    vendor: 'Cisco',
    platform: 'IOS-XE',
    model: 'ISR4451',
    version: '17.3.4a',
    siteName: 'DC1',
    intentChecks: { passed: 45, failed: 5 }
  },
  {
    id: 'dev-002',
    hostname: 'switch-01',
    ip: '10.0.0.2',
    sn: 'SN002',
    loginIp: '10.0.0.2',
    loginType: 'ssh',
    vendor: 'Cisco',
    platform: 'IOS-XE',
    model: 'C9300',
    version: '17.3.4a',
    siteName: 'DC1',
    intentChecks: { passed: 50, failed: 0 }
  },
  {
    id: 'dev-003',
    hostname: 'firewall-01',
    ip: '10.0.0.3',
    sn: 'SN003',
    loginIp: '10.0.0.3',
    loginType: 'ssh',
    vendor: 'Palo Alto',
    platform: 'PAN-OS',
    model: 'PA-5220',
    version: '10.2.3',
    siteName: 'DC1',
    intentChecks: { passed: 40, failed: 10 }
  }
]

export const emptyDevices: Device[] = []

// =============================================================================
// PCI-DSS METRICS FIXTURES
// =============================================================================

/**
 * Full metrics with all data available - ideal scenario
 */
export const fullPCIDSSMetrics: PCIDSSMetrics = {
  totalDevices: 100,
  totalSites: 5,

  // Requirement 1 - Network Security Controls
  aclPolicyCount: 250,
  aclPolicyCountAvailable: true,
  zoneFwPolicyCount: 75,
  zoneFwPolicyCountAvailable: true,
  anyAnyAclCount: 3,
  anyAnyAclAvailable: true,
  anyAnyFwCount: 1,
  anyAnyFwAvailable: true,
  telnetPercent: 5,
  telnetAvailable: true,
  configurationCount: 100,
  configurationCountAvailable: true,
  bgpNeighborsCount: 4,
  bgpNeighborsAvailable: true,
  diagramAvailable: true,

  // Requirement 2 - Secure Configurations
  endOfSupportPercent: 2,
  endOfSupportAvailable: true,
  discoveryIssuesCount: 3,
  localAaaUsersPercent: 15,
  localAaaUsersAvailable: true,
  aaaAuthPercent: 85,
  aaaAuthAvailable: true,
  ntpPercent: 95,
  ntpAvailable: true,

  // Requirement 10 - Logging
  localLoggingPercent: 90,
  localLoggingAvailable: true,
  remoteLoggingPercent: 80,
  remoteLoggingAvailable: true,

  // Requirement 11 - Security Testing
  wirelessAPCount: 25,
  wirelessAPAvailable: true,

  // Requirement 12 - Policy
  platformTypesCount: 8,
  platformTypesAvailable: true,
  osVersionVariance: 3,

  // Previous metrics for delta scoring
  previousMetrics: {
    totalDevices: 95,
    totalSites: 5,
    aclPolicyCount: 240,
    aclPolicyCountAvailable: true,
    zoneFwPolicyCount: 70,
    zoneFwPolicyCountAvailable: true,
    anyAnyAclCount: 5,
    anyAnyAclAvailable: true,
    anyAnyFwCount: 2,
    anyAnyFwAvailable: true,
    telnetPercent: 8,
    telnetAvailable: true,
    configurationCount: 95,
    configurationCountAvailable: true,
    bgpNeighborsCount: 4,
    bgpNeighborsAvailable: true,
    diagramAvailable: true,
    endOfSupportPercent: 3,
    endOfSupportAvailable: true,
    discoveryIssuesCount: 5,
    localAaaUsersPercent: 18,
    localAaaUsersAvailable: true,
    aaaAuthPercent: 82,
    aaaAuthAvailable: true,
    ntpPercent: 92,
    ntpAvailable: true,
    localLoggingPercent: 88,
    localLoggingAvailable: true,
    remoteLoggingPercent: 75,
    remoteLoggingAvailable: true,
    wirelessAPCount: 28,
    wirelessAPAvailable: true,
    platformTypesCount: 8,
    platformTypesAvailable: true,
    osVersionVariance: 4
  }
}

/**
 * Metrics with positive deltas (improvements)
 */
export const metricsWithPositiveDeltas: PCIDSSMetrics = {
  ...fullPCIDSSMetrics,
  aclPolicyCount: 300,
  zoneFwPolicyCount: 100,
  configurationCount: 120,
  previousMetrics: {
    ...fullPCIDSSMetrics.previousMetrics,
    aclPolicyCount: 250,
    zoneFwPolicyCount: 75,
    configurationCount: 100
  }
}

/**
 * Metrics with negative deltas (regressions)
 */
export const metricsWithNegativeDeltas: PCIDSSMetrics = {
  ...fullPCIDSSMetrics,
  aclPolicyCount: 200,
  zoneFwPolicyCount: 50,
  configurationCount: 80,
  previousMetrics: {
    ...fullPCIDSSMetrics.previousMetrics,
    aclPolicyCount: 250,
    zoneFwPolicyCount: 75,
    configurationCount: 100
  }
}

/**
 * Metrics without previous snapshot (no baseline for delta scoring)
 */
export const metricsWithoutBaseline: PCIDSSMetrics = {
  ...fullPCIDSSMetrics,
  previousMetrics: undefined
}

/**
 * Metrics with data unavailable
 */
export const metricsWithUnavailableData: PCIDSSMetrics = {
  totalDevices: 100,
  totalSites: 5,

  aclPolicyCount: null,
  aclPolicyCountAvailable: false,
  aclPolicyCountReason: 'API endpoint returned 404',
  zoneFwPolicyCount: null,
  zoneFwPolicyCountAvailable: false,
  zoneFwPolicyCountReason: 'API endpoint returned 404',
  anyAnyAclCount: null,
  anyAnyAclAvailable: false,
  anyAnyFwCount: null,
  anyAnyFwAvailable: false,
  telnetPercent: null,
  telnetAvailable: false,
  configurationCount: null,
  configurationCountAvailable: false,
  bgpNeighborsCount: null,
  bgpNeighborsAvailable: false,
  diagramAvailable: false,
  diagramReason: 'Graph endpoint not available',

  endOfSupportPercent: null,
  endOfSupportAvailable: false,
  discoveryIssuesCount: 0,
  localAaaUsersPercent: null,
  localAaaUsersAvailable: false,
  aaaAuthPercent: null,
  aaaAuthAvailable: false,
  ntpPercent: null,
  ntpAvailable: false,

  localLoggingPercent: null,
  localLoggingAvailable: false,
  remoteLoggingPercent: null,
  remoteLoggingAvailable: false,

  wirelessAPCount: null,
  wirelessAPAvailable: false,

  platformTypesCount: null,
  platformTypesAvailable: false,
  osVersionVariance: 0
}

/**
 * Metrics for wired-only network (no wireless APs - special case for Req 11)
 */
export const wiredOnlyMetrics: PCIDSSMetrics = {
  ...fullPCIDSSMetrics,
  wirelessAPCount: 0,
  wirelessAPAvailable: true,
  wirelessAPNotApplicable: true,
  previousMetrics: {
    ...fullPCIDSSMetrics.previousMetrics,
    wirelessAPCount: 0,
    wirelessAPAvailable: true,
    wirelessAPNotApplicable: true
  }
}

/**
 * Metrics with high OS version variance (for Req 12 threshold testing)
 */
export const highVarianceMetrics: PCIDSSMetrics = {
  ...fullPCIDSSMetrics,
  osVersionVariance: 8,
  previousMetrics: {
    ...fullPCIDSSMetrics.previousMetrics,
    osVersionVariance: 10
  }
}

/**
 * Metrics with low OS version variance
 */
export const lowVarianceMetrics: PCIDSSMetrics = {
  ...fullPCIDSSMetrics,
  osVersionVariance: 2,
  previousMetrics: {
    ...fullPCIDSSMetrics.previousMetrics,
    osVersionVariance: 2
  }
}

// =============================================================================
// MOCK API RESPONSES
// =============================================================================

/**
 * Standard API response shape for table endpoints
 */
export interface MockAPIResponse {
  _meta: {
    count: number
    size: number
    limit: number
    start: number
    snapshot?: string
  }
  data: Record<string, unknown>[]
}

/**
 * Create a mock API response with specified size
 */
export function createMockAPIResponse(size: number, data: Record<string, unknown>[] = []): MockAPIResponse {
  return {
    _meta: {
      count: size,
      size: size,
      limit: 5000,
      start: 0,
      snapshot: 'mock-snapshot-id'
    },
    data: data.length > 0 ? data : Array(size).fill({}).map((_, i) => ({ id: `item-${i}` }))
  }
}

/**
 * Mock API call function for testing
 */
export function createMockApiCall(responses: Record<string, MockAPIResponse | unknown>) {
  return async (endpoint: string, _options?: unknown): Promise<unknown> => {
    // Strip leading slash and /api prefix if present
    const normalizedEndpoint = endpoint.replace(/^\/?(api\/)?/, '')

    if (normalizedEndpoint in responses) {
      return responses[normalizedEndpoint]
    }

    // Check for partial matches
    for (const key of Object.keys(responses)) {
      if (normalizedEndpoint.includes(key) || key.includes(normalizedEndpoint)) {
        return responses[key]
      }
    }

    // Default empty response
    return { _meta: { size: 0, count: 0 }, data: [] }
  }
}

// =============================================================================
// EXPECTED RESULTS
// =============================================================================

/**
 * Expected requirement scores for full metrics with positive deltas
 * These are baseline expectations for regression testing
 */
export const expectedScoresFullMetrics = {
  requirement1: {
    maxScore: 55,
    // With positive deltas on ACL, ZoneFW, Config - expect high score
    minExpectedScore: 40
  },
  requirement2: {
    maxScore: 35,
    // With low EoS%, low discovery issues, good AAA - expect high score
    minExpectedScore: 25
  },
  requirement6: {
    maxScore: 5,
    // With 2% EoS - expect near max
    minExpectedScore: 4
  },
  requirement7: {
    maxScore: 5,
    // With 85% AAA - expect near max
    minExpectedScore: 4
  },
  requirement8: {
    maxScore: 15,
    // With good AAA and SSH usage - expect good score
    minExpectedScore: 10
  },
  requirement10: {
    maxScore: 15,
    // With 90% local, 80% remote, 95% NTP - expect high score
    minExpectedScore: 12
  },
  requirement11: {
    maxScore: 5,
    // With wireless APs decreasing - expect full score
    minExpectedScore: 4
  },
  requirement12: {
    maxScore: 20,
    // With 3 OS versions (mid-tier) and good inventory - expect medium score
    minExpectedScore: 12
  }
}

// =============================================================================
// CIS METRICS FIXTURES
// =============================================================================

/**
 * Full CIS metrics with all data available
 */
export const fullCISMetrics: CISMetrics = {
  totalDevices: 100,

  // Control 1: Enterprise Asset Inventory
  discoveryIssues: 3,
  siteCount: 5,
  siteCountAvailable: true,
  uniquePlatforms: 8,
  uniquePlatformsAvailable: true,
  intentChecksPassed: 850,
  intentChecksFailed: 50,

  // Control 2: Software Asset Inventory
  versionVariance: 3,
  endOfSupportDevices: 2,

  // Control 3: Data Protection
  anyAnyAclCount: 3,
  anyAnyAclAvailable: true,
  dnsCoveragePercent: 92,
  dnsCoverageAvailable: true,
  telnetPercent: 5,
  telnetAvailable: true,
  remoteLoggingPercent: 85,
  remoteLoggingAvailable: true,
  aaaPercent: 88,
  aaaAvailable: true,

  // Control 4: Secure Configuration
  localAaaUsersPercent: 12,
  localAaaUsersAvailable: true,
  dnsServersCount: 2,
  dnsServersAvailable: true,

  // Control 8: Audit Log Management
  localLoggingPercent: 92,
  localLoggingAvailable: true,
  ntpPercent: 95,
  ntpAvailable: true,

  // Control 13: Network Monitoring
  zoneFirewallCount: 45,
  zoneFirewallAvailable: true,
  flowCollectionCount: 3,
  flowCollectionAvailable: true,
  port8021xPercent: 75,
  port8021xAvailable: true,

  // Control 17: Incident Response
  routesCount: 1500,
  routesAvailable: true,
  unstableRoutesCount: 5,
  unstableRoutesAvailable: true,
  errDisabledPercent: 2,
  errDisabledAvailable: true,
  pathLookupAvailable: true,
  pathLookupCheckCount: 10,
  pathLookupMethod: 'path-checks',

  // Previous metrics for delta scoring
  previousMetrics: {
    totalDevices: 95,
    discoveryIssues: 5,
    siteCount: 5,
    siteCountAvailable: true,
    uniquePlatforms: 8,
    uniquePlatformsAvailable: true,
    intentChecksPassed: 800,
    intentChecksFailed: 60,
    versionVariance: 4,
    endOfSupportDevices: 3,
    anyAnyAclCount: 5,
    anyAnyAclAvailable: true,
    dnsCoveragePercent: 88,
    dnsCoverageAvailable: true,
    telnetPercent: 8,
    telnetAvailable: true,
    remoteLoggingPercent: 80,
    remoteLoggingAvailable: true,
    aaaPercent: 85,
    aaaAvailable: true,
    localAaaUsersPercent: 15,
    localAaaUsersAvailable: true,
    dnsServersCount: 2,
    dnsServersAvailable: true,
    localLoggingPercent: 88,
    localLoggingAvailable: true,
    ntpPercent: 92,
    ntpAvailable: true,
    zoneFirewallCount: 40,
    zoneFirewallAvailable: true,
    flowCollectionCount: 2,
    flowCollectionAvailable: true,
    port8021xPercent: 70,
    port8021xAvailable: true,
    routesCount: 1400,
    routesAvailable: true,
    unstableRoutesCount: 8,
    unstableRoutesAvailable: true,
    errDisabledPercent: 3,
    errDisabledAvailable: true,
    pathLookupAvailable: true,
    pathLookupCheckCount: 8
  }
}

/**
 * CIS metrics without previous baseline
 */
export const cisMetricsWithoutBaseline: CISMetrics = {
  ...fullCISMetrics,
  previousMetrics: undefined
}

/**
 * CIS metrics with unavailable data
 */
export const cisMetricsUnavailable: CISMetrics = {
  totalDevices: 100,
  discoveryIssues: 0,
  siteCount: null,
  siteCountAvailable: false,
  siteCountReason: 'API endpoint unavailable',
  uniquePlatforms: null,
  uniquePlatformsAvailable: false,
  intentChecksPassed: 0,
  intentChecksFailed: 0,
  versionVariance: 0,
  endOfSupportDevices: 0,
  anyAnyAclCount: null,
  anyAnyAclAvailable: false,
  dnsCoveragePercent: null,
  dnsCoverageAvailable: false,
  telnetPercent: null,
  telnetAvailable: false,
  remoteLoggingPercent: null,
  remoteLoggingAvailable: false,
  aaaPercent: null,
  aaaAvailable: false,
  localAaaUsersPercent: null,
  localAaaUsersAvailable: false,
  dnsServersCount: null,
  dnsServersAvailable: false,
  localLoggingPercent: null,
  localLoggingAvailable: false,
  ntpPercent: null,
  ntpAvailable: false,
  zoneFirewallCount: null,
  zoneFirewallAvailable: false,
  flowCollectionCount: null,
  flowCollectionAvailable: false,
  port8021xPercent: null,
  port8021xAvailable: false,
  routesCount: null,
  routesAvailable: false,
  unstableRoutesCount: null,
  unstableRoutesAvailable: false,
  errDisabledPercent: null,
  errDisabledAvailable: false,
  pathLookupAvailable: false,
  pathLookupUnavailableReason: 'Graph API not available'
}
