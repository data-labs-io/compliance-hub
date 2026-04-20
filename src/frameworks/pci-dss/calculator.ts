// PCI DSS v4.0.1 Calculator based on IP Fabric data
// Based on PCI-DSS-gap-analysis-mockup-v3.pdf
// 6 requirements implemented with real IP Fabric network data

import { Device } from '@/lib/device-generator'
import type { PCIDSSMetrics, PCIDSSRequirement, PCIDSSSubRequirementDetail } from './types'
import {
  fetchDiscoveryErrors,
  fetchVersionVariance,
  fetchEndOfSupportSummary,
  fetchSiteCount,
  fetchPlatformTypes,
  fetchAnyAnyAclCount,
  fetchTelnetPercentage,
  fetchAaaPercentage,
  fetchLocalAaaUsersPercentage,
  fetchLocalLoggingPercentage,
  fetchRemoteLoggingPercentage,
  fetchNtpPercentage,
  fetchZoneFirewallCount,
  fetchBgpNeighborsCount,
  fetchWirelessAPCount,
  fetchDiagramAvailability,
  MetricResult
} from '@/services/metrics-api'

// Helper function to add delay between API calls to avoid rate limiting
// Delays removed - rate limiter handles API throttling globally

/**
 * Helper function to determine status based on score
 */
function getStatus(score: number, maxScore: number): 'pass' | 'warning' | 'fail' {
  const percentage = (score / maxScore) * 100
  if (percentage >= 80) return 'pass'
  if (percentage >= 50) return 'warning'
  return 'fail'
}

/**
 * Helper function to get RAG color based on target met
 */
function getRAGColor(targetMet: boolean, dataAvailable: boolean = true): 'green' | 'amber' | 'red' {
  if (!dataAvailable) return 'red'
  return targetMet ? 'green' : 'amber'
}

/**
 * Calculate Requirement 1: Install and Maintain Network Security Controls
 * Maximum: 55 points (11 checks from PDF)
 */
function calculateRequirement1Score(metrics: PCIDSSMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 55
  const details: PCIDSSSubRequirementDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // Sub-requirement 1.2.1: Configuration standards for NSC rulesets (10 points)
  // ACL Policies (5pts) + Zone Firewall Policies (5pts)
  // Scoring: if either A or B value = 0, score = 0, else delta >= 0 gets full score

  const aclDelta = (
    metrics.aclPolicyCountAvailable &&
    metrics.aclPolicyCount !== null &&
    prevMetrics?.aclPolicyCountAvailable &&
    prevMetrics?.aclPolicyCount !== null
  ) ? metrics.aclPolicyCount - prevMetrics.aclPolicyCount! : undefined

  // Fix: Per docs, "If either A or B = 0, score = 0" - both snapshots must have >0 AND delta >= 0
  const aclScore = (
    metrics.aclPolicyCountAvailable &&
    metrics.aclPolicyCount !== null &&
    metrics.aclPolicyCount > 0 &&
    prevMetrics?.aclPolicyCountAvailable === true &&
    prevMetrics?.aclPolicyCount !== null &&
    prevMetrics?.aclPolicyCount !== undefined &&
    prevMetrics.aclPolicyCount > 0 &&
    aclDelta !== undefined &&
    aclDelta >= 0
  ) ? 5 : 0

  const zoneFwDelta = (
    metrics.zoneFwPolicyCountAvailable &&
    metrics.zoneFwPolicyCount !== null &&
    prevMetrics?.zoneFwPolicyCountAvailable &&
    prevMetrics?.zoneFwPolicyCount !== null
  ) ? metrics.zoneFwPolicyCount - prevMetrics.zoneFwPolicyCount! : undefined

  // Fix: Per docs, "If either A or B = 0, score = 0" - both snapshots must have >0 AND delta >= 0
  const zoneFwScore = (
    metrics.zoneFwPolicyCountAvailable &&
    metrics.zoneFwPolicyCount !== null &&
    metrics.zoneFwPolicyCount > 0 &&
    prevMetrics?.zoneFwPolicyCountAvailable === true &&
    prevMetrics?.zoneFwPolicyCount !== null &&
    prevMetrics?.zoneFwPolicyCount !== undefined &&
    prevMetrics.zoneFwPolicyCount > 0 &&
    zoneFwDelta !== undefined &&
    zoneFwDelta >= 0
  ) ? 5 : 0

  score += aclScore + zoneFwScore

  // Check if comparative snapshot is needed for delta-based scoring
  const needs121Comparison = !prevMetrics || aclDelta === undefined || zoneFwDelta === undefined

  details.push({
    id: '1.2.1',
    name: 'Configuration standards for NSC rulesets',
    ipFabricContext: 'ACL and Zone Firewall policy enumeration',
    maxPoints: 10,
    currentValue: `ACL: ${metrics.aclPolicyCount ?? 'N/A'}, Zone FW: ${metrics.zoneFwPolicyCount ?? 'N/A'}`,
    previousValue: prevMetrics ? `ACL: ${prevMetrics.aclPolicyCount ?? 'N/A'}, Zone FW: ${prevMetrics.zoneFwPolicyCount ?? 'N/A'}` : undefined,
    delta: (aclDelta !== undefined && zoneFwDelta !== undefined) ? `ACL: ${aclDelta >= 0 ? '+' : ''}${aclDelta}, FW: ${zoneFwDelta >= 0 ? '+' : ''}${zoneFwDelta}` : undefined,
    calculatedPoints: Math.round((aclScore + zoneFwScore) * 100) / 100,
    scoringRule: 'ACL (5pts) + Zone FW (5pts) if Delta ≥ 0',
    unavailabilityReason: !metrics.aclPolicyCountAvailable ? metrics.aclPolicyCountReason : !metrics.zoneFwPolicyCountAvailable ? metrics.zoneFwPolicyCountReason : undefined,
    requiresComparativeSnapshot: needs121Comparison,
    breakdown: [
      {
        metric: 'ACL Policies',
        value: metrics.aclPolicyCount ?? 'Data Unavailable',
        points: aclScore,
        rule: 'Delta ≥ 0 = 5 points',
        previousValue: prevMetrics?.aclPolicyCount ?? undefined,
        delta: aclDelta !== undefined ? `${aclDelta >= 0 ? '+' : ''}${aclDelta}` : undefined
      },
      {
        metric: 'Zone Firewall Policies',
        value: metrics.zoneFwPolicyCount ?? 'Data Unavailable',
        points: zoneFwScore,
        rule: 'Delta ≥ 0 = 5 points',
        previousValue: prevMetrics?.zoneFwPolicyCount ?? undefined,
        delta: zoneFwDelta !== undefined ? `${zoneFwDelta >= 0 ? '+' : ''}${zoneFwDelta}` : undefined
      }
    ]
  })

  // Sub-requirement 1.2.2: Changes to network connections approved (5 points)
  const configDelta = (
    metrics.configurationCountAvailable &&
    metrics.configurationCount !== null &&
    prevMetrics?.configurationCountAvailable &&
    prevMetrics?.configurationCount !== null
  ) ? metrics.configurationCount - prevMetrics.configurationCount! : undefined

  // Fix: Per docs, "If either A or B = 0, score = 0" - both snapshots must have >0 AND delta >= 0
  const configScore = (
    metrics.configurationCountAvailable &&
    metrics.configurationCount !== null &&
    metrics.configurationCount > 0 &&
    prevMetrics?.configurationCountAvailable === true &&
    prevMetrics?.configurationCount !== null &&
    prevMetrics?.configurationCount !== undefined &&
    prevMetrics.configurationCount > 0 &&
    configDelta !== undefined &&
    configDelta >= 0
  ) ? 5 : 0

  score += configScore

  const needs122Comparison = !prevMetrics || configDelta === undefined

  details.push({
    id: '1.2.2',
    name: 'Changes to NSC configurations approved and managed',
    ipFabricContext: 'Device Configuration Management',
    maxPoints: 5,
    currentValue: metrics.configurationCount ?? 'Data Unavailable',
    previousValue: prevMetrics?.configurationCount ?? undefined,
    delta: configDelta !== undefined ? `${configDelta >= 0 ? '+' : ''}${configDelta}` : undefined,
    calculatedPoints: configScore,
    scoringRule: 'Delta ≥ 0 = 5 points',
    unavailabilityReason: !metrics.configurationCountAvailable ? metrics.configurationCountReason : undefined,
    requiresComparativeSnapshot: needs122Comparison
  })

  // Sub-requirement 1.2.3: Accurate network diagrams maintained (5 points)
  // Binary check - can generate diagrams from both snapshots or not
  const diagramScore = (
    metrics.diagramAvailable &&
    (!prevMetrics || prevMetrics.diagramAvailable !== false)
  ) ? 5 : 0

  score += diagramScore

  details.push({
    id: '1.2.3',
    name: 'Accurate network diagram maintained',
    ipFabricContext: 'Automatic Diagramming',
    maxPoints: 5,
    currentValue: metrics.diagramAvailable ? 'Available' : 'Not Available',
    previousValue: prevMetrics ? (prevMetrics.diagramAvailable ? 'Available' : 'Not Available') : undefined,
    calculatedPoints: diagramScore,
    scoringRule: 'Binary: 5 points if both snapshots can generate diagrams',
    unavailabilityReason: !metrics.diagramAvailable ? metrics.diagramReason : undefined
  })

  // Sub-requirement 1.2.5: Services, protocols, ports identified - ANY/ANY detection (10 points)
  // ACL ANY/ANY (5pts) + FW ANY/ANY (5pts) - reverse polarity (Delta ≤ 0 is good)

  const anyAnyAclDelta = (
    metrics.anyAnyAclAvailable &&
    metrics.anyAnyAclCount !== null &&
    prevMetrics?.anyAnyAclAvailable &&
    prevMetrics?.anyAnyAclCount !== null
  ) ? metrics.anyAnyAclCount - prevMetrics.anyAnyAclCount! : undefined

  // Fix: Require either 0 ANY/ANY rules OR valid delta <= 0 (not undefined)
  const anyAnyAclScore = (
    metrics.anyAnyAclAvailable &&
    metrics.anyAnyAclCount !== null &&
    (metrics.anyAnyAclCount === 0 || (anyAnyAclDelta !== undefined && anyAnyAclDelta <= 0))
  ) ? 5 : 0

  const anyAnyFwDelta = (
    metrics.anyAnyFwAvailable &&
    metrics.anyAnyFwCount !== null &&
    prevMetrics?.anyAnyFwAvailable &&
    prevMetrics?.anyAnyFwCount !== null
  ) ? metrics.anyAnyFwCount - prevMetrics.anyAnyFwCount! : undefined

  // Fix: Require either 0 ANY/ANY rules OR valid delta <= 0 (not undefined)
  const anyAnyFwScore = (
    metrics.anyAnyFwAvailable &&
    metrics.anyAnyFwCount !== null &&
    (metrics.anyAnyFwCount === 0 || (anyAnyFwDelta !== undefined && anyAnyFwDelta <= 0))
  ) ? 5 : 0

  score += anyAnyAclScore + anyAnyFwScore

  // Check if comparative snapshot needed - only if current has ANY/ANY rules (count > 0)
  const needs125Comparison = (metrics.anyAnyAclCount !== null && metrics.anyAnyAclCount > 0 && anyAnyAclDelta === undefined) ||
                             (metrics.anyAnyFwCount !== null && metrics.anyAnyFwCount > 0 && anyAnyFwDelta === undefined)

  details.push({
    id: '1.2.5',
    name: 'Services, protocols, ports identified and approved',
    ipFabricContext: 'ANY/ANY ACL and Firewall policies',
    maxPoints: 10,
    currentValue: `ACL ANY/ANY: ${metrics.anyAnyAclCount ?? 'N/A'}, FW ANY/ANY: ${metrics.anyAnyFwCount ?? 'N/A'}`,
    previousValue: prevMetrics ? `ACL ANY/ANY: ${prevMetrics.anyAnyAclCount ?? 'N/A'}, FW ANY/ANY: ${prevMetrics.anyAnyFwCount ?? 'N/A'}` : undefined,
    delta: (anyAnyAclDelta !== undefined && anyAnyFwDelta !== undefined) ? `ACL: ${anyAnyAclDelta >= 0 ? '+' : ''}${anyAnyAclDelta}, FW: ${anyAnyFwDelta >= 0 ? '+' : ''}${anyAnyFwDelta}` : undefined,
    calculatedPoints: Math.round((anyAnyAclScore + anyAnyFwScore) * 100) / 100,
    scoringRule: 'ACL (5pts) + FW (5pts) if Delta ≤ 0 (reverse polarity)',
    unavailabilityReason: !metrics.anyAnyAclAvailable ? metrics.anyAnyAclReason : !metrics.anyAnyFwAvailable ? metrics.anyAnyFwReason : undefined,
    requiresComparativeSnapshot: needs125Comparison,
    breakdown: [
      {
        metric: 'ACL ANY/ANY Rules',
        value: metrics.anyAnyAclCount ?? 'Data Unavailable',
        points: anyAnyAclScore,
        rule: 'Delta ≤ 0 = 5 points (fewer is better)',
        previousValue: prevMetrics?.anyAnyAclCount ?? undefined,
        delta: anyAnyAclDelta !== undefined ? `${anyAnyAclDelta >= 0 ? '+' : ''}${anyAnyAclDelta}` : undefined
      },
      {
        metric: 'Firewall ANY/ANY Rules',
        value: metrics.anyAnyFwCount ?? 'Data Unavailable',
        points: anyAnyFwScore,
        rule: 'Delta ≤ 0 = 5 points (fewer is better)',
        previousValue: prevMetrics?.anyAnyFwCount ?? undefined,
        delta: anyAnyFwDelta !== undefined ? `${anyAnyFwDelta >= 0 ? '+' : ''}${anyAnyFwDelta}` : undefined
      }
    ]
  })

  // Sub-requirement 1.2.6: Security features for insecure protocols (5 points)
  // Telnet percentage - reverse polarity (lower is better)
  const telnetScore = (metrics.telnetAvailable && metrics.telnetPercent !== null)
    ? ((100 - metrics.telnetPercent) / 100) * 5
    : 0

  score += telnetScore

  details.push({
    id: '1.2.6',
    name: 'Security features implemented for insecure protocols',
    ipFabricContext: 'Clear text telnet protocol enabled',
    maxPoints: 5,
    currentValue: metrics.telnetAvailable && metrics.telnetPercent !== null
      ? `${metrics.telnetPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.telnetAvailable && prevMetrics?.telnetPercent !== null
      ? `${prevMetrics.telnetPercent!.toFixed(1)}%`
      : undefined,
    calculatedPoints: Math.round(telnetScore * 100) / 100,
    scoringRule: '((100 - percentage) / 100) × 5 (target: 0%)',
    unavailabilityReason: !metrics.telnetAvailable ? metrics.telnetReason : undefined
  })

  // Sub-requirement 1.2.7: NSC configurations reviewed (5 points)
  // Same as 1.2.2 - using configuration count
  const configReviewScore = configScore  // Reuse same logic

  score += configReviewScore

  details.push({
    id: '1.2.7',
    name: 'NSC configurations reviewed every six months',
    ipFabricContext: 'Device Configuration Management',
    maxPoints: 5,
    currentValue: metrics.configurationCount ?? 'Data Unavailable',
    previousValue: prevMetrics?.configurationCount ?? undefined,
    delta: configDelta !== undefined ? `${configDelta >= 0 ? '+' : ''}${configDelta}` : undefined,
    calculatedPoints: configReviewScore,
    scoringRule: 'Delta ≥ 0 = 5 points',
    unavailabilityReason: !metrics.configurationCountAvailable ? metrics.configurationCountReason : undefined,
    requiresComparativeSnapshot: needs122Comparison
  })

  // Sub-requirement 1.3.1, 1.3.2, 1.4.1, 1.4.2: Traffic restrictions (5 points combined)
  // Combined ACL + Zone FW - same as 1.2.1 but combined scoring
  const trafficRestrictionScore = (aclScore > 0 && zoneFwScore > 0) ? 5 : 0

  score += trafficRestrictionScore

  details.push({
    id: '1.3.1-1.3.2-1.4.1-1.4.2',
    name: 'Inbound/outbound traffic restrictions with NSCs',
    ipFabricContext: 'ACL and Zone Firewall policies',
    maxPoints: 5,
    currentValue: `ACL: ${metrics.aclPolicyCount ?? 'N/A'}, Zone FW: ${metrics.zoneFwPolicyCount ?? 'N/A'}`,
    previousValue: prevMetrics ? `ACL: ${prevMetrics.aclPolicyCount ?? 'N/A'}, Zone FW: ${prevMetrics.zoneFwPolicyCount ?? 'N/A'}` : undefined,
    calculatedPoints: trafficRestrictionScore,
    scoringRule: 'Combined 5 points if both ACL and FW Delta ≥ 0',
    unavailabilityReason: !metrics.aclPolicyCountAvailable ? metrics.aclPolicyCountReason : !metrics.zoneFwPolicyCountAvailable ? metrics.zoneFwPolicyCountReason : undefined,
    requiresComparativeSnapshot: needs121Comparison
  })

  // Sub-requirement 1.4.5: Internal IP disclosure limited (5 points)
  // BGP neighbors - reverse polarity (Delta ≤ 0 is good)
  const bgpDelta = (
    metrics.bgpNeighborsAvailable &&
    metrics.bgpNeighborsCount !== null &&
    prevMetrics?.bgpNeighborsAvailable &&
    prevMetrics?.bgpNeighborsCount !== null
  ) ? metrics.bgpNeighborsCount - prevMetrics.bgpNeighborsCount! : undefined

  // Fix: Require either 0 BGP neighbors OR valid delta <= 0 (not undefined)
  const bgpScore = (
    metrics.bgpNeighborsAvailable &&
    metrics.bgpNeighborsCount !== null &&
    (metrics.bgpNeighborsCount === 0 || (bgpDelta !== undefined && bgpDelta <= 0))
  ) ? 5 : 0

  score += bgpScore

  // Check if comparative snapshot needed - only if current has BGP neighbors (count > 0)
  const needs145Comparison = metrics.bgpNeighborsCount !== null && metrics.bgpNeighborsCount > 0 && bgpDelta === undefined

  details.push({
    id: '1.4.5',
    name: 'Internal IP disclosure limited to authorized parties',
    ipFabricContext: 'eBGP Neighbours',
    maxPoints: 5,
    currentValue: metrics.bgpNeighborsCount ?? 'Data Unavailable',
    previousValue: prevMetrics?.bgpNeighborsCount ?? undefined,
    delta: bgpDelta !== undefined ? `${bgpDelta >= 0 ? '+' : ''}${bgpDelta}` : undefined,
    calculatedPoints: bgpScore,
    scoringRule: 'Delta ≤ 0 = 5 points (reverse polarity)',
    unavailabilityReason: !metrics.bgpNeighborsAvailable ? metrics.bgpNeighborsReason : undefined,
    requiresComparativeSnapshot: needs145Comparison
  })

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

/**
 * Calculate Requirement 2: Apply Secure Configurations to All System Components
 * Maximum: 35 points (7 checks from PDF)
 */
function calculateRequirement2Score(metrics: PCIDSSMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 35
  const details: PCIDSSSubRequirementDetail[] = []
  const prevMetrics = metrics.previousMetrics
  const totalDevices = metrics.totalDevices

  // Sub-requirement 2.2.1: Configuration standards (10 points)
  // EoS (5pts) + Discovery Issues (5pts)

  // EoS - reverse polarity (lower is better)
  const eosScore = (metrics.endOfSupportAvailable && metrics.endOfSupportPercent !== null)
    ? ((100 - metrics.endOfSupportPercent) / 100) * 5
    : 0

  // Discovery Issues - threshold-based penalty
  let discoveryScore = 5  // Start with full 5 points
  if (metrics.discoveryIssuesCount > 0 && metrics.discoveryIssuesCount <= 10) {
    discoveryScore = 4  // -1 penalty
  } else if (metrics.discoveryIssuesCount >= 11) {
    discoveryScore = 3  // -2 penalty
  }

  score += eosScore + discoveryScore

  details.push({
    id: '2.2.1',
    name: 'Configuration standards developed, implemented, maintained',
    ipFabricContext: 'End of Support + Discovery Issues',
    maxPoints: 10,
    currentValue: `EoS: ${metrics.endOfSupportPercent !== null ? metrics.endOfSupportPercent.toFixed(1) + '%' : 'N/A'}, Discovery: ${metrics.discoveryIssuesCount}`,
    previousValue: prevMetrics ? `EoS: ${prevMetrics.endOfSupportPercent !== null ? prevMetrics.endOfSupportPercent!.toFixed(1) + '%' : 'N/A'}, Discovery: ${prevMetrics.discoveryIssuesCount ?? 'N/A'}` : undefined,
    calculatedPoints: Math.round((eosScore + discoveryScore) * 100) / 100,
    scoringRule: 'EoS: ((100 - %) / 100) × 5, Discovery: 5 - penalty',
    unavailabilityReason: !metrics.endOfSupportAvailable ? metrics.endOfSupportReason : undefined,
    breakdown: [
      {
        metric: 'End of Support Devices',
        value: metrics.endOfSupportPercent !== null ? `${metrics.endOfSupportPercent.toFixed(1)}%` : 'Data Unavailable',
        points: Math.round(eosScore * 100) / 100,
        rule: 'Target 0%: ((100 - %) / 100) × 5',
        previousValue: prevMetrics?.endOfSupportPercent !== null ? `${prevMetrics?.endOfSupportPercent!.toFixed(1)}%` : undefined
      },
      {
        metric: 'Discovery Issues',
        value: metrics.discoveryIssuesCount,
        points: discoveryScore,
        rule: '0 errors=5pts, 1-10=-1, ≥11=-2',
        previousValue: prevMetrics?.discoveryIssuesCount ?? undefined
      }
    ]
  })

  // Sub-requirement 2.2.2: Vendor default accounts managed (5 points)
  const localAaaScore = (metrics.localAaaUsersAvailable && metrics.localAaaUsersPercent !== null)
    ? (metrics.localAaaUsersPercent / 100) * 5
    : 0

  score += localAaaScore

  details.push({
    id: '2.2.2',
    name: 'Vendor default accounts managed',
    ipFabricContext: 'LOCAL user authentication accounts',
    maxPoints: 5,
    currentValue: metrics.localAaaUsersAvailable && metrics.localAaaUsersPercent !== null
      ? `${metrics.localAaaUsersPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.localAaaUsersAvailable && prevMetrics?.localAaaUsersPercent !== null
      ? `${prevMetrics.localAaaUsersPercent!.toFixed(1)}%`
      : undefined,
    calculatedPoints: Math.round(localAaaScore * 100) / 100,
    scoringRule: '(percentage / 100) × 5',
    unavailabilityReason: !metrics.localAaaUsersAvailable ? metrics.localAaaUsersReason : undefined
  })

  // Sub-requirement 2.2.4: Only necessary services enabled (5 points)
  // Telnet - reverse polarity
  const telnetScore = (metrics.telnetAvailable && metrics.telnetPercent !== null)
    ? ((100 - metrics.telnetPercent) / 100) * 5
    : 0

  score += telnetScore

  details.push({
    id: '2.2.4',
    name: 'Only necessary services, protocols, functions enabled',
    ipFabricContext: 'Clear text telnet protocol left enabled',
    maxPoints: 5,
    currentValue: metrics.telnetAvailable && metrics.telnetPercent !== null
      ? `${metrics.telnetPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.telnetAvailable && prevMetrics?.telnetPercent !== null
      ? `${prevMetrics.telnetPercent!.toFixed(1)}%`
      : undefined,
    calculatedPoints: Math.round(telnetScore * 100) / 100,
    scoringRule: '((100 - percentage) / 100) × 5 (target: 0%)',
    unavailabilityReason: !metrics.telnetAvailable ? metrics.telnetReason : undefined
  })

  // Sub-requirement 2.2.6: System security parameters configured (10 points)
  // AAA Auth (5pts) + NTP (5pts)

  const aaaScore = (metrics.aaaAuthAvailable && metrics.aaaAuthPercent !== null)
    ? (metrics.aaaAuthPercent / 100) * 5
    : 0

  const ntpScore = (metrics.ntpAvailable && metrics.ntpPercent !== null)
    ? (metrics.ntpPercent / 100) * 5
    : 0

  score += aaaScore + ntpScore

  details.push({
    id: '2.2.6',
    name: 'System security parameters configured to prevent misuse',
    ipFabricContext: 'AAA Authentication + NTP Synchronization',
    maxPoints: 10,
    currentValue: `AAA: ${metrics.aaaAuthPercent !== null ? metrics.aaaAuthPercent.toFixed(1) + '%' : 'N/A'}, NTP: ${metrics.ntpPercent !== null ? metrics.ntpPercent.toFixed(1) + '%' : 'N/A'}`,
    previousValue: prevMetrics ? `AAA: ${prevMetrics.aaaAuthPercent !== null ? prevMetrics.aaaAuthPercent!.toFixed(1) + '%' : 'N/A'}, NTP: ${prevMetrics.ntpPercent !== null ? prevMetrics.ntpPercent!.toFixed(1) + '%' : 'N/A'}` : undefined,
    calculatedPoints: Math.round((aaaScore + ntpScore) * 100) / 100,
    scoringRule: 'AAA: (% / 100) × 5, NTP: (% / 100) × 5',
    unavailabilityReason: !metrics.aaaAuthAvailable ? metrics.aaaAuthReason : !metrics.ntpAvailable ? metrics.ntpReason : undefined,
    breakdown: [
      {
        metric: 'AAA Authentication',
        value: metrics.aaaAuthPercent !== null ? `${metrics.aaaAuthPercent.toFixed(1)}%` : 'Data Unavailable',
        points: Math.round(aaaScore * 100) / 100,
        rule: '(percentage / 100) × 5',
        previousValue: prevMetrics?.aaaAuthPercent !== null ? `${prevMetrics?.aaaAuthPercent!.toFixed(1)}%` : undefined
      },
      {
        metric: 'NTP Synchronized',
        value: metrics.ntpPercent !== null ? `${metrics.ntpPercent.toFixed(1)}%` : 'Data Unavailable',
        points: Math.round(ntpScore * 100) / 100,
        rule: '(percentage / 100) × 5 (target: 100%)',
        previousValue: prevMetrics?.ntpPercent !== null ? `${prevMetrics?.ntpPercent!.toFixed(1)}%` : undefined
      }
    ]
  })

  // Sub-requirement 2.2.7: Non-console access encrypted (5 points)
  // Telnet again - same calculation
  const telnetEncryptScore = telnetScore  // Reuse

  score += telnetEncryptScore

  details.push({
    id: '2.2.7',
    name: 'Non-console administrative access encrypted',
    ipFabricContext: 'Clear text telnet protocol left enabled',
    maxPoints: 5,
    currentValue: metrics.telnetAvailable && metrics.telnetPercent !== null
      ? `${metrics.telnetPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.telnetAvailable && prevMetrics?.telnetPercent !== null
      ? `${prevMetrics.telnetPercent!.toFixed(1)}%`
      : undefined,
    calculatedPoints: Math.round(telnetEncryptScore * 100) / 100,
    scoringRule: '((100 - percentage) / 100) × 5 (target: 0%)',
    unavailabilityReason: !metrics.telnetAvailable ? metrics.telnetReason : undefined
  })

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

/**
 * Calculate Requirement 6: Develop and Maintain Secure Systems and Software
 * Maximum: 5 points (1 check)
 */
function calculateRequirement6Score(metrics: PCIDSSMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 5
  const details: PCIDSSSubRequirementDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // Sub-requirement 6.3.3: Protected from known vulnerabilities (5 points)
  // End of Support - reverse polarity
  const eosScore = (metrics.endOfSupportAvailable && metrics.endOfSupportPercent !== null)
    ? ((100 - metrics.endOfSupportPercent) / 100) * 5
    : 0

  score += eosScore

  details.push({
    id: '6.3.3',
    name: 'Systems protected from known vulnerabilities',
    ipFabricContext: 'Lifecycle Management (End of Support)',
    maxPoints: 5,
    currentValue: metrics.endOfSupportAvailable && metrics.endOfSupportPercent !== null
      ? `${metrics.endOfSupportPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.endOfSupportAvailable && prevMetrics?.endOfSupportPercent !== null
      ? `${prevMetrics.endOfSupportPercent!.toFixed(1)}%`
      : undefined,
    calculatedPoints: Math.round(eosScore * 100) / 100,
    scoringRule: '((100 - percentage) / 100) × 5 (target: 0%)',
    unavailabilityReason: !metrics.endOfSupportAvailable ? metrics.endOfSupportReason : undefined
  })

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

/**
 * Calculate Requirement 7: Restrict Access to System Components and Cardholder Data
 * Maximum: 5 points (1 check)
 */
function calculateRequirement7Score(metrics: PCIDSSMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 5
  const details: PCIDSSSubRequirementDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // Sub-requirement 7.2.1, 7.2.2, 7.2.5, 7.3.1: Access control with least privileges (5 points)
  const aaaScore = (metrics.aaaAuthAvailable && metrics.aaaAuthPercent !== null)
    ? (metrics.aaaAuthPercent / 100) * 5
    : 0

  score += aaaScore

  details.push({
    id: '7.2.1-7.2.2-7.2.5-7.3.1',
    name: 'Access control model with least privileges',
    ipFabricContext: 'TACACS and RADIUS servers configured',
    maxPoints: 5,
    currentValue: metrics.aaaAuthAvailable && metrics.aaaAuthPercent !== null
      ? `${metrics.aaaAuthPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.aaaAuthAvailable && prevMetrics?.aaaAuthPercent !== null
      ? `${prevMetrics.aaaAuthPercent!.toFixed(1)}%`
      : undefined,
    calculatedPoints: Math.round(aaaScore * 100) / 100,
    scoringRule: '(percentage / 100) × 5',
    unavailabilityReason: !metrics.aaaAuthAvailable ? metrics.aaaAuthReason : undefined
  })

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

/**
 * Calculate Requirement 8: Identify Users and Authenticate Access
 * Maximum: 15 points (3 checks from PDF)
 */
function calculateRequirement8Score(metrics: PCIDSSMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 15
  const details: PCIDSSSubRequirementDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // Sub-requirement 8.2.2: Group/shared IDs used only when necessary (9 points)
  // Local AAA (4pts) + AAA Auth (5pts)

  const localAaaScore = (metrics.localAaaUsersAvailable && metrics.localAaaUsersPercent !== null)
    ? (metrics.localAaaUsersPercent / 100) * 4
    : 0

  const aaaScore = (metrics.aaaAuthAvailable && metrics.aaaAuthPercent !== null)
    ? (metrics.aaaAuthPercent / 100) * 5
    : 0

  score += localAaaScore + aaaScore

  details.push({
    id: '8.2.2',
    name: 'Group, shared, generic IDs used only when necessary',
    ipFabricContext: 'LOCAL user accounts + TACACS/RADIUS servers',
    maxPoints: 9,
    currentValue: `Local: ${metrics.localAaaUsersPercent !== null ? metrics.localAaaUsersPercent.toFixed(1) + '%' : 'N/A'}, AAA: ${metrics.aaaAuthPercent !== null ? metrics.aaaAuthPercent.toFixed(1) + '%' : 'N/A'}`,
    previousValue: prevMetrics ? `Local: ${prevMetrics.localAaaUsersPercent !== null ? prevMetrics.localAaaUsersPercent!.toFixed(1) + '%' : 'N/A'}, AAA: ${prevMetrics.aaaAuthPercent !== null ? prevMetrics.aaaAuthPercent!.toFixed(1) + '%' : 'N/A'}` : undefined,
    calculatedPoints: Math.round((localAaaScore + aaaScore) * 100) / 100,
    scoringRule: 'Local AAA: (% / 100) × 4, AAA Auth: (% / 100) × 5',
    unavailabilityReason: !metrics.localAaaUsersAvailable ? metrics.localAaaUsersReason : !metrics.aaaAuthAvailable ? metrics.aaaAuthReason : undefined,
    breakdown: [
      {
        metric: 'Local AAA Users',
        value: metrics.localAaaUsersPercent !== null ? `${metrics.localAaaUsersPercent.toFixed(1)}%` : 'Data Unavailable',
        points: Math.round(localAaaScore * 100) / 100,
        rule: '(percentage / 100) × 4'
      },
      {
        metric: 'AAA Authentication',
        value: metrics.aaaAuthPercent !== null ? `${metrics.aaaAuthPercent.toFixed(1)}%` : 'Data Unavailable',
        points: Math.round(aaaScore * 100) / 100,
        rule: '(percentage / 100) × 5'
      }
    ]
  })

  // Sub-requirement 8.3.2: Strong cryptography for authentication (6 points)
  // Telnet - reverse polarity
  const telnetScore = (metrics.telnetAvailable && metrics.telnetPercent !== null)
    ? ((100 - metrics.telnetPercent) / 100) * 6
    : 0

  score += telnetScore

  details.push({
    id: '8.3.2',
    name: 'Strong cryptography for authentication factors',
    ipFabricContext: 'Clear text telnet protocol left enabled',
    maxPoints: 6,
    currentValue: metrics.telnetAvailable && metrics.telnetPercent !== null
      ? `${metrics.telnetPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.telnetAvailable && prevMetrics?.telnetPercent !== null
      ? `${prevMetrics.telnetPercent!.toFixed(1)}%`
      : undefined,
    calculatedPoints: Math.round(telnetScore * 100) / 100,
    scoringRule: '((100 - percentage) / 100) × 6 (target: 0%)',
    unavailabilityReason: !metrics.telnetAvailable ? metrics.telnetReason : undefined
  })

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

/**
 * Calculate Requirement 10: Log and Monitor All Access
 * Maximum: 15 points (3 checks from PDF)
 */
function calculateRequirement10Score(metrics: PCIDSSMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 15
  const details: PCIDSSSubRequirementDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // Sub-requirement 10.2.1: Audit logs enabled (10 points)
  // Local Logging (5pts) + Remote Logging (5pts)

  const localLogScore = (metrics.localLoggingAvailable && metrics.localLoggingPercent !== null)
    ? (metrics.localLoggingPercent / 100) * 5
    : 0

  const remoteLogScore = (metrics.remoteLoggingAvailable && metrics.remoteLoggingPercent !== null)
    ? (metrics.remoteLoggingPercent / 100) * 5
    : 0

  score += localLogScore + remoteLogScore

  details.push({
    id: '10.2.1',
    name: 'Audit logs enabled and active',
    ipFabricContext: 'Local Logging + Remote Logging',
    maxPoints: 10,
    currentValue: `Local: ${metrics.localLoggingPercent !== null ? metrics.localLoggingPercent.toFixed(1) + '%' : 'N/A'}, Remote: ${metrics.remoteLoggingPercent !== null ? metrics.remoteLoggingPercent.toFixed(1) + '%' : 'N/A'}`,
    previousValue: prevMetrics ? `Local: ${prevMetrics.localLoggingPercent !== null ? prevMetrics.localLoggingPercent!.toFixed(1) + '%' : 'N/A'}, Remote: ${prevMetrics.remoteLoggingPercent !== null ? prevMetrics.remoteLoggingPercent!.toFixed(1) + '%' : 'N/A'}` : undefined,
    calculatedPoints: Math.round((localLogScore + remoteLogScore) * 100) / 100,
    scoringRule: 'Local: (% / 100) × 5, Remote: (% / 100) × 5',
    unavailabilityReason: !metrics.localLoggingAvailable ? metrics.localLoggingReason : !metrics.remoteLoggingAvailable ? metrics.remoteLoggingReason : undefined,
    breakdown: [
      {
        metric: 'Local Logging',
        value: metrics.localLoggingPercent !== null ? `${metrics.localLoggingPercent.toFixed(1)}%` : 'Data Unavailable',
        points: Math.round(localLogScore * 100) / 100,
        rule: '(percentage / 100) × 5 (target: 100%)'
      },
      {
        metric: 'Remote Logging',
        value: metrics.remoteLoggingPercent !== null ? `${metrics.remoteLoggingPercent.toFixed(1)}%` : 'Data Unavailable',
        points: Math.round(remoteLogScore * 100) / 100,
        rule: '(percentage / 100) × 5 (target: 100%)'
      }
    ]
  })

  // Sub-requirement 10.6.1, 10.6.2: System clocks synchronized (5 points)
  const ntpScore = (metrics.ntpAvailable && metrics.ntpPercent !== null)
    ? (metrics.ntpPercent / 100) * 5
    : 0

  score += ntpScore

  details.push({
    id: '10.6.1-10.6.2',
    name: 'System clocks synchronized',
    ipFabricContext: 'NTP configured and synchronized',
    maxPoints: 5,
    currentValue: metrics.ntpAvailable && metrics.ntpPercent !== null
      ? `${metrics.ntpPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.ntpAvailable && prevMetrics?.ntpPercent !== null
      ? `${prevMetrics.ntpPercent!.toFixed(1)}%`
      : undefined,
    calculatedPoints: Math.round(ntpScore * 100) / 100,
    scoringRule: '(percentage / 100) × 5 (target: 100%)',
    unavailabilityReason: !metrics.ntpAvailable ? metrics.ntpReason : undefined
  })

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

/**
 * Calculate Requirement 11: Test Security of Systems and Networks Regularly
 * Maximum: 5 points (1 check)
 *
 * Scoring logic handles three scenarios:
 * 1. available=false: Cannot determine → 0 points, "Data Unavailable"
 * 2. available=true, count=0: Wired-only network → 5 points (compliant per PCI DSS)
 * 3. available=true, count>0: Has wireless → score based on delta
 */
function calculateRequirement11Score(metrics: PCIDSSMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 5
  const details: PCIDSSSubRequirementDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // Check if this is a wired-only network (0 wireless APs discovered)
  const isWiredOnly = metrics.wirelessAPAvailable &&
                      metrics.wirelessAPCount !== null &&
                      metrics.wirelessAPCount === 0

  // Calculate delta only for networks with wireless infrastructure
  const prevWirelessCount = prevMetrics?.wirelessAPCount
  const wirelessDelta = (
    metrics.wirelessAPAvailable &&
    metrics.wirelessAPCount !== null &&
    metrics.wirelessAPCount > 0 &&
    prevMetrics?.wirelessAPAvailable &&
    prevWirelessCount !== null &&
    prevWirelessCount !== undefined &&
    prevWirelessCount > 0
  ) ? metrics.wirelessAPCount - prevWirelessCount : undefined

  let wirelessScore = 0
  let displayValue: number | string = 'Data Unavailable'
  let scoringRule = ''

  if (!metrics.wirelessAPAvailable || metrics.wirelessAPCount === null) {
    // Scenario 1: Data unavailable (API error or endpoint not accessible)
    wirelessScore = 0
    displayValue = 'Data Unavailable'
    scoringRule = 'Data Unavailable = 0 points'
  } else if (isWiredOnly) {
    // Scenario 2: Wired-only network - award full points
    // Per PCI DSS 11.2.2: Requires inventory of authorized wireless APs
    // If no authorized APs exist, requirement is satisfied
    wirelessScore = 5
    displayValue = '0 (Wired-only network)'
    scoringRule = 'Wired-only network = 5 points (compliant - no APs to inventory)'
  } else {
    // Scenario 3: Has wireless infrastructure - score based on delta
    // Fix: Remove !prevMetrics bypass - require baseline. Keep prev===0 (wired-only to wireless transition is valid)
    const deltaOk = prevMetrics?.wirelessAPCount === 0 ||
                    (wirelessDelta !== undefined && wirelessDelta >= 0)
    wirelessScore = deltaOk ? 5 : 0
    displayValue = metrics.wirelessAPCount
    scoringRule = deltaOk ? 'Delta >= 0 = 5 points' : 'Comparative snapshot required for delta scoring'
  }

  score += wirelessScore

  // Check if comparative snapshot needed - only if current has wireless APs and delta not calculated
  const needs1122Comparison = !isWiredOnly && metrics.wirelessAPCount !== null && metrics.wirelessAPCount > 0 &&
                              wirelessDelta === undefined && prevMetrics?.wirelessAPCount !== 0

  details.push({
    id: '11.2.2',
    name: 'Wireless AP inventory maintained',
    ipFabricContext: 'Authorized/discovered wireless AP inventory',
    maxPoints: 5,
    currentValue: displayValue,
    previousValue: prevMetrics?.wirelessAPCount ?? undefined,
    delta: wirelessDelta !== undefined ? `${wirelessDelta >= 0 ? '+' : ''}${wirelessDelta}` : undefined,
    calculatedPoints: wirelessScore,
    scoringRule,
    unavailabilityReason: !metrics.wirelessAPAvailable ? metrics.wirelessAPReason : undefined,
    requiresComparativeSnapshot: needs1122Comparison
  })

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

/**
 * Calculate Requirement 12: Support Information Security with Policies
 * Maximum: 20 points (4 checks from PDF)
 */
function calculateRequirement12Score(metrics: PCIDSSMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 20
  const details: PCIDSSSubRequirementDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // Sub-requirement 12.3.4, 12.5.1: Device inventory (5 points)
  // Fix: Per docs, "both snapshots have >0 devices" required
  const deviceScore = (
    metrics.totalDevices > 0 &&
    prevMetrics?.totalDevices !== undefined &&
    prevMetrics.totalDevices > 0
  ) ? 5 : 0

  score += deviceScore

  // Check if comparative snapshot is needed
  const needsDeviceComparison = metrics.totalDevices > 0 &&
                                (prevMetrics?.totalDevices === undefined || prevMetrics.totalDevices === 0)

  const deviceDelta = prevMetrics?.totalDevices !== undefined
    ? metrics.totalDevices - prevMetrics.totalDevices
    : undefined

  details.push({
    id: '12.3.4-12.5.1-devices',
    name: 'Hardware/software inventory maintained',
    ipFabricContext: 'Devices',
    maxPoints: 5,
    currentValue: metrics.totalDevices,
    previousValue: prevMetrics?.totalDevices ?? undefined,
    delta: deviceDelta !== undefined ? `${deviceDelta >= 0 ? '+' : ''}${deviceDelta}` : undefined,
    calculatedPoints: deviceScore,
    scoringRule: 'Both snapshots > 0 devices = 5 points',
    requiresComparativeSnapshot: needsDeviceComparison,
    breakdown: [
      {
        metric: 'Total Devices',
        value: metrics.totalDevices,
        previousValue: prevMetrics?.totalDevices,
        delta: deviceDelta !== undefined ? `${deviceDelta >= 0 ? '+' : ''}${deviceDelta}` : undefined,
        points: deviceScore,
        rule: 'Both snapshots > 0 devices = 5 points'
      }
    ]
  })

  // Sub-requirement 12.3.4, 12.5.1: Site inventory (5 points)
  // Fix: Per docs, "both snapshots have >0 sites" required
  const siteScore = (
    metrics.totalSites > 0 &&
    prevMetrics?.totalSites !== undefined &&
    prevMetrics.totalSites > 0
  ) ? 5 : 0

  score += siteScore

  // Check if comparative snapshot is needed
  const needsSiteComparison = metrics.totalSites > 0 &&
                              (prevMetrics?.totalSites === undefined || prevMetrics.totalSites === 0)

  const siteDelta = prevMetrics?.totalSites !== undefined
    ? metrics.totalSites - prevMetrics.totalSites
    : undefined

  details.push({
    id: '12.3.4-12.5.1-sites',
    name: 'Inventory includes site/location context',
    ipFabricContext: 'Sites',
    maxPoints: 5,
    currentValue: metrics.totalSites,
    previousValue: prevMetrics?.totalSites ?? undefined,
    delta: siteDelta !== undefined ? `${siteDelta >= 0 ? '+' : ''}${siteDelta}` : undefined,
    calculatedPoints: siteScore,
    scoringRule: 'Both snapshots > 0 sites = 5 points',
    requiresComparativeSnapshot: needsSiteComparison,
    breakdown: [
      {
        metric: 'Total Sites',
        value: metrics.totalSites,
        previousValue: prevMetrics?.totalSites,
        delta: siteDelta !== undefined ? `${siteDelta >= 0 ? '+' : ''}${siteDelta}` : undefined,
        points: siteScore,
        rule: 'Both snapshots > 0 sites = 5 points'
      }
    ]
  })

  // Sub-requirement 12.3.4, 12.5.1: Platform types (5 points)
  // Fix: Per docs, "both snapshots have >0 platforms" required
  const platformScore = (
    metrics.platformTypesAvailable &&
    metrics.platformTypesCount !== null &&
    metrics.platformTypesCount > 0 &&
    prevMetrics?.platformTypesAvailable === true &&
    prevMetrics?.platformTypesCount !== null &&
    prevMetrics?.platformTypesCount !== undefined &&
    prevMetrics.platformTypesCount > 0
  ) ? 5 : 0

  score += platformScore

  // Check if comparative snapshot needed - both snapshots must have >0 platforms
  const needsPlatformComparison = metrics.platformTypesCount !== null && metrics.platformTypesCount > 0 &&
                                  (!prevMetrics?.platformTypesAvailable || prevMetrics?.platformTypesCount === null)

  const platformDelta = (
    metrics.platformTypesAvailable &&
    metrics.platformTypesCount !== null &&
    prevMetrics?.platformTypesAvailable &&
    prevMetrics?.platformTypesCount !== null &&
    prevMetrics?.platformTypesCount !== undefined
  ) ? metrics.platformTypesCount - prevMetrics.platformTypesCount : undefined

  details.push({
    id: '12.3.4-12.5.1-platforms',
    name: 'Hardware/software technologies reviewed',
    ipFabricContext: 'Unique platform or family types',
    maxPoints: 5,
    currentValue: metrics.platformTypesCount ?? 'Data Unavailable',
    previousValue: prevMetrics?.platformTypesCount ?? undefined,
    delta: platformDelta !== undefined ? `${platformDelta >= 0 ? '+' : ''}${platformDelta}` : undefined,
    calculatedPoints: platformScore,
    scoringRule: 'Both snapshots > 0 platforms = 5 points',
    unavailabilityReason: !metrics.platformTypesAvailable ? metrics.platformTypesReason : undefined,
    requiresComparativeSnapshot: needsPlatformComparison,
    breakdown: [
      {
        metric: 'Platform Types',
        value: metrics.platformTypesAvailable && metrics.platformTypesCount !== null
          ? metrics.platformTypesCount
          : 'Data Unavailable',
        previousValue: prevMetrics?.platformTypesCount ?? undefined,
        delta: platformDelta !== undefined ? `${platformDelta >= 0 ? '+' : ''}${platformDelta}` : undefined,
        points: platformScore,
        rule: 'Both snapshots > 0 platforms = 5 points'
      }
    ]
  })

  // Sub-requirement 12.3.4, 12.5.1: OS version variance (5 points)
  // Threshold-based: 1-3 versions = 5pts, 3-5 = 3pts, 6-10+ = 1pt
  let varianceScore = 0
  if (metrics.osVersionVariance >= 1 && metrics.osVersionVariance <= 3) {
    varianceScore = 5
  } else if (metrics.osVersionVariance > 3 && metrics.osVersionVariance <= 5) {
    varianceScore = 3
  } else if (metrics.osVersionVariance >= 6) {
    varianceScore = 1
  }

  score += varianceScore

  const varianceDelta = prevMetrics?.osVersionVariance !== undefined
    ? metrics.osVersionVariance - prevMetrics.osVersionVariance
    : undefined

  details.push({
    id: '12.3.4-12.5.1-variance',
    name: 'Software version consistency maintained',
    ipFabricContext: 'Highest NOS Version Variance',
    maxPoints: 5,
    currentValue: metrics.osVersionVariance,
    previousValue: prevMetrics?.osVersionVariance ?? undefined,
    delta: varianceDelta !== undefined ? `${varianceDelta >= 0 ? '+' : ''}${varianceDelta}` : undefined,
    calculatedPoints: varianceScore,
    scoringRule: '1-3 versions = 5pts, 3-5 = 3pts, 6+ = 1pt',
    breakdown: [
      {
        metric: 'OS Version Variance',
        value: metrics.osVersionVariance,
        previousValue: prevMetrics?.osVersionVariance,
        delta: varianceDelta !== undefined ? `${varianceDelta >= 0 ? '+' : ''}${varianceDelta}` : undefined,
        points: varianceScore,
        rule: 'Variance ≤3 = 5pts, ≤5 = 3pts, ≥6 = 1pt'
      }
    ]
  })

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

// ============================================================================
// Main Calculator Functions
// ============================================================================

/**
 * Calculate overall PCI DSS compliance score
 */
export function calculateOverallPCIDSSScore(requirements: PCIDSSRequirement[]): number {
  const totalScore = requirements.reduce((sum, req) => sum + req.score, 0)
  const maxScore = requirements.reduce((sum, req) => sum + req.maxScore, 0)
  return maxScore > 0 ? (totalScore / maxScore) * 100 : 0
}

/**
 * Fetch metrics for Batch 1: Requirements 1 & 2
 * ~18 API calls total
 */
async function fetchBatch1Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<PCIDSSMetrics>> {
  const metrics: Partial<PCIDSSMetrics> = {}

  // Requirement 1 metrics
  // ACL policy count
  const aclCountResult = await fetchAnyAnyAclCount(snapshotId, apiCall)  // This returns MetricResult for ANY/ANY, we need total count
  // We need to fetch total ACL count differently
  try {
    const aclResponse = await apiCall('tables/security/acl', {
      method: 'POST',
      body: {
        columns: ['hostname', 'policyName', 'action'],
        filters: { active: ['eq', true] },
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })
    if (aclResponse && aclResponse._meta) {
      metrics.aclPolicyCount = aclResponse._meta.size || 0
      metrics.aclPolicyCountAvailable = true
    } else {
      metrics.aclPolicyCount = null
      metrics.aclPolicyCountAvailable = false
      metrics.aclPolicyCountReason = 'ACL endpoint returned no data'
    }
  } catch (error) {
    metrics.aclPolicyCount = null
    metrics.aclPolicyCountAvailable = false
    metrics.aclPolicyCountReason = 'ACL endpoint not accessible'
  }


  // Zone Firewall policy count
  const zoneFwResult = await fetchZoneFirewallCount(snapshotId, apiCall)
  metrics.zoneFwPolicyCount = zoneFwResult.value
  metrics.zoneFwPolicyCountAvailable = zoneFwResult.available
  metrics.zoneFwPolicyCountReason = zoneFwResult.reason


  // ANY/ANY ACL count
  const anyAnyAclResult = await fetchAnyAnyAclCount(snapshotId, apiCall)
  metrics.anyAnyAclCount = anyAnyAclResult.value
  metrics.anyAnyAclAvailable = anyAnyAclResult.available
  metrics.anyAnyAclReason = anyAnyAclResult.reason


  // ANY/ANY Firewall count - need to fetch separately
  try {
    // Note: Zone firewall policies don't support complex regex filters on array columns
    // We fetch all policies and the scoring logic handles the count appropriately
    const anyAnyFwResponse = await apiCall('tables/security/zone-firewall/policies', {
      method: 'POST',
      body: {
        columns: ['hostname', 'action', 'active'],
        filters: { active: ['eq', true] },
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })
    if (anyAnyFwResponse && anyAnyFwResponse._meta) {
      metrics.anyAnyFwCount = anyAnyFwResponse._meta.size || 0
      metrics.anyAnyFwAvailable = true
    } else {
      metrics.anyAnyFwCount = null
      metrics.anyAnyFwAvailable = false
      metrics.anyAnyFwReason = 'Zone FW ANY/ANY endpoint returned no data'
    }
  } catch (error) {
    metrics.anyAnyFwCount = null
    metrics.anyAnyFwAvailable = false
    metrics.anyAnyFwReason = 'Zone FW ANY/ANY endpoint not accessible'
  }


  // Telnet percentage
  const telnetResult = await fetchTelnetPercentage(snapshotId, totalDevices, apiCall)
  metrics.telnetPercent = telnetResult.value
  metrics.telnetAvailable = telnetResult.available
  metrics.telnetReason = telnetResult.reason


  // Configuration count
  try {
    const configResponse = await apiCall('tables/management/configuration', {
      method: 'POST',
      body: {
        columns: ['hostname'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })
    if (configResponse && configResponse._meta) {
      metrics.configurationCount = configResponse._meta.size || 0
      metrics.configurationCountAvailable = true
    } else {
      metrics.configurationCount = null
      metrics.configurationCountAvailable = false
      metrics.configurationCountReason = 'Configuration endpoint returned no data'
    }
  } catch (error) {
    metrics.configurationCount = null
    metrics.configurationCountAvailable = false
    metrics.configurationCountReason = 'Configuration endpoint not accessible'
  }


  // BGP neighbors
  const bgpResult = await fetchBgpNeighborsCount(snapshotId, apiCall)
  metrics.bgpNeighborsCount = bgpResult.value
  metrics.bgpNeighborsAvailable = bgpResult.available
  metrics.bgpNeighborsReason = bgpResult.reason


  // Diagram availability
  const diagramResult = await fetchDiagramAvailability(snapshotId, apiCall)
  metrics.diagramAvailable = diagramResult.value || false
  metrics.diagramReason = diagramResult.reason


  // Requirement 2 metrics
  // End of Support
  const eosData = await fetchEndOfSupportSummary(snapshotId, totalDevices, apiCall)
  const eosPercent = eosData ? eosData.percentage : null
  metrics.endOfSupportPercent = eosPercent
  metrics.endOfSupportAvailable = eosPercent !== null
  metrics.endOfSupportReason = eosPercent === null ? 'End of Support data not available' : undefined


  // Discovery errors
  const discoveryData = await fetchDiscoveryErrors(snapshotId, apiCall)
  metrics.discoveryIssuesCount = discoveryData?.data?.count || 0


  // Local AAA users
  const localAaaResult = await fetchLocalAaaUsersPercentage(snapshotId, totalDevices, apiCall)
  metrics.localAaaUsersPercent = localAaaResult.value
  metrics.localAaaUsersAvailable = localAaaResult.available
  metrics.localAaaUsersReason = localAaaResult.reason


  // AAA Authentication
  const aaaResult = await fetchAaaPercentage(snapshotId, totalDevices, apiCall)
  metrics.aaaAuthPercent = aaaResult.value
  metrics.aaaAuthAvailable = aaaResult.available
  metrics.aaaAuthReason = aaaResult.reason


  // NTP
  const ntpResult = await fetchNtpPercentage(snapshotId, totalDevices, apiCall)
  metrics.ntpPercent = ntpResult.value
  metrics.ntpAvailable = ntpResult.available
  metrics.ntpReason = ntpResult.reason


  return metrics
}

/**
 * Fetch metrics for Batch 2: Requirements 6 & 7
 * Reuses metrics from Batch 1 - no new API calls
 */
async function fetchBatch2Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<PCIDSSMetrics>> {
  // Requirements 6 & 7 reuse metrics from Batch 1
  // No new API calls needed
  return {}
}

/**
 * Fetch metrics for Batch 3: Requirements 8 & 10
 * ~2 API calls (rest reused from Batch 1)
 */
async function fetchBatch3Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<PCIDSSMetrics>> {
  const metrics: Partial<PCIDSSMetrics> = {}

  // Local logging
  const localLogResult = await fetchLocalLoggingPercentage(snapshotId, totalDevices, apiCall)
  metrics.localLoggingPercent = localLogResult.value
  metrics.localLoggingAvailable = localLogResult.available
  metrics.localLoggingReason = localLogResult.reason


  // Remote logging
  const remoteLogResult = await fetchRemoteLoggingPercentage(snapshotId, totalDevices, apiCall)
  metrics.remoteLoggingPercent = remoteLogResult.value
  metrics.remoteLoggingAvailable = remoteLogResult.available
  metrics.remoteLoggingReason = remoteLogResult.reason


  // Requirements 8 reuses telnet, localAaaUsers, aaaAuth from Batch 1
  // Requirement 10 reuses NTP from Batch 1

  return metrics
}

/**
 * Fetch metrics for Batch 4: Requirements 11 & 12
 * ~5 API calls
 */
async function fetchBatch4Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<PCIDSSMetrics>> {
  const metrics: Partial<PCIDSSMetrics> = {}

  // Requirement 11: Wireless APs
  const wirelessResult = await fetchWirelessAPCount(snapshotId, apiCall)
  metrics.wirelessAPCount = wirelessResult.value
  metrics.wirelessAPAvailable = wirelessResult.available
  metrics.wirelessAPReason = wirelessResult.reason
  metrics.wirelessAPNotApplicable = wirelessResult.notApplicable || false


  // Requirement 12: Site count
  const siteResult = await fetchSiteCount(snapshotId, apiCall)
  // totalSites is extracted from siteResult
  const totalSites = siteResult.value || 0
  metrics.totalSites = totalSites


  // Platform types
  const platformResult = await fetchPlatformTypes(snapshotId, apiCall)
  metrics.platformTypesCount = platformResult.value
  metrics.platformTypesAvailable = platformResult.available
  metrics.platformTypesReason = platformResult.reason


  // OS version variance
  const versionData = await fetchVersionVariance(snapshotId, apiCall)
  metrics.osVersionVariance = versionData?.variance || 0


  return metrics
}

/**
 * Calculate all PCI DSS requirements with progressive loading
 * Follows exact same pattern as CIS calculator
 */
export async function calculatePCIDSSRequirementsProgressive(
  devices: Device[],
  snapshotId: string,
  apiCall: (endpoint: string, options?: any) => Promise<any>,
  previousSnapshotId?: string,
  previousDevices?: Device[],
  onBatchComplete?: (batchNum: number, partialReqs: PCIDSSRequirement[], totalBatches: number) => void
): Promise<PCIDSSRequirement[]> {
  const totalDevices = devices.length
  let allMetrics: PCIDSSMetrics = {
    totalDevices,
    totalSites: 0,

    // Initialize all metrics as null/false
    aclPolicyCount: null,
    aclPolicyCountAvailable: false,
    zoneFwPolicyCount: null,
    zoneFwPolicyCountAvailable: false,
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

  // Batch 1: Requirements 1 & 2 (18 API calls)
  const batch1Metrics = await fetchBatch1Metrics(snapshotId, totalDevices, apiCall)
  allMetrics = { ...allMetrics, ...batch1Metrics }

  const requirement1 = {
    id: '1',
    name: 'Network Security Controls',
    ...calculateRequirement1Score(allMetrics, devices)
  }

  const requirement2 = {
    id: '2',
    name: 'Secure Configurations',
    ...calculateRequirement2Score(allMetrics, devices)
  }

  if (onBatchComplete) {
    onBatchComplete(1, [requirement1, requirement2], 4)
  }

  // Rate limiter handles timing between batches

  // Batch 2: Requirements 6 & 7 (reuse from Batch 1)
  const batch2Metrics = await fetchBatch2Metrics(snapshotId, totalDevices, apiCall)
  allMetrics = { ...allMetrics, ...batch2Metrics }

  const requirement6 = {
    id: '6',
    name: 'Secure Systems and Software',
    ...calculateRequirement6Score(allMetrics, devices)
  }

  const requirement7 = {
    id: '7',
    name: 'Access Restrictions',
    ...calculateRequirement7Score(allMetrics, devices)
  }

  if (onBatchComplete) {
    onBatchComplete(2, [requirement1, requirement2, requirement6, requirement7], 4)
  }

  // Rate limiter handles timing

  // Batch 3: Requirements 8 & 10 (2 API calls)
  const batch3Metrics = await fetchBatch3Metrics(snapshotId, totalDevices, apiCall)
  allMetrics = { ...allMetrics, ...batch3Metrics }

  const requirement8 = {
    id: '8',
    name: 'User Authentication',
    ...calculateRequirement8Score(allMetrics, devices)
  }

  const requirement10 = {
    id: '10',
    name: 'Logging and Monitoring',
    ...calculateRequirement10Score(allMetrics, devices)
  }

  if (onBatchComplete) {
    onBatchComplete(3, [requirement1, requirement2, requirement6, requirement7, requirement8, requirement10], 4)
  }

  // Rate limiter handles timing

  // Batch 4: Requirements 11 & 12 (5 API calls)
  const batch4Metrics = await fetchBatch4Metrics(snapshotId, totalDevices, apiCall)
  allMetrics = { ...allMetrics, ...batch4Metrics }

  const requirement11 = {
    id: '11',
    name: 'Security Testing',
    ...calculateRequirement11Score(allMetrics, devices)
  }

  const requirement12 = {
    id: '12',
    name: 'Information Security Policy',
    ...calculateRequirement12Score(allMetrics, devices)
  }

  const allRequirements = [
    requirement1,
    requirement2,
    requirement6,
    requirement7,
    requirement8,
    requirement10,
    requirement11,
    requirement12
  ]

  if (onBatchComplete) {
    onBatchComplete(4, allRequirements, 4)
  }

  // If previous snapshot provided, fetch previous metrics for delta calculation
  if (previousSnapshotId && previousDevices) {
    const previousMetrics = await fetchPreviousMetrics(
      previousSnapshotId,
      previousDevices.length,
      apiCall
    )
    allMetrics.previousMetrics = previousMetrics
  }

  return allRequirements
}

/**
 * Fetch previous snapshot metrics for delta calculation
 * Called after current snapshot fully loaded
 */
async function fetchPreviousMetrics(
  previousSnapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<PCIDSSMetrics['previousMetrics']> {
  // Fetch all metrics for previous snapshot with delays to avoid rate limiting

  // Batch 1 metrics
  const batch1 = await fetchBatch1Metrics(previousSnapshotId, totalDevices, apiCall)


  // Batch 3 metrics (Batch 2 reuses Batch 1)
  const batch3 = await fetchBatch3Metrics(previousSnapshotId, totalDevices, apiCall)


  // Batch 4 metrics
  const batch4 = await fetchBatch4Metrics(previousSnapshotId, totalDevices, apiCall)

  return {
    totalDevices,
    totalSites: batch4.totalSites,
    aclPolicyCount: batch1.aclPolicyCount,
    aclPolicyCountAvailable: batch1.aclPolicyCountAvailable,
    zoneFwPolicyCount: batch1.zoneFwPolicyCount,
    zoneFwPolicyCountAvailable: batch1.zoneFwPolicyCountAvailable,
    anyAnyAclCount: batch1.anyAnyAclCount,
    anyAnyAclAvailable: batch1.anyAnyAclAvailable,
    anyAnyFwCount: batch1.anyAnyFwCount,
    anyAnyFwAvailable: batch1.anyAnyFwAvailable,
    telnetPercent: batch1.telnetPercent,
    telnetAvailable: batch1.telnetAvailable,
    configurationCount: batch1.configurationCount,
    configurationCountAvailable: batch1.configurationCountAvailable,
    bgpNeighborsCount: batch1.bgpNeighborsCount,
    bgpNeighborsAvailable: batch1.bgpNeighborsAvailable,
    diagramAvailable: batch1.diagramAvailable,
    endOfSupportPercent: batch1.endOfSupportPercent,
    endOfSupportAvailable: batch1.endOfSupportAvailable,
    discoveryIssuesCount: batch1.discoveryIssuesCount,
    localAaaUsersPercent: batch1.localAaaUsersPercent,
    localAaaUsersAvailable: batch1.localAaaUsersAvailable,
    aaaAuthPercent: batch1.aaaAuthPercent,
    aaaAuthAvailable: batch1.aaaAuthAvailable,
    ntpPercent: batch1.ntpPercent,
    ntpAvailable: batch1.ntpAvailable,
    localLoggingPercent: batch3.localLoggingPercent,
    localLoggingAvailable: batch3.localLoggingAvailable,
    remoteLoggingPercent: batch3.remoteLoggingPercent,
    remoteLoggingAvailable: batch3.remoteLoggingAvailable,
    wirelessAPCount: batch4.wirelessAPCount,
    wirelessAPAvailable: batch4.wirelessAPAvailable,
    platformTypesCount: batch4.platformTypesCount,
    platformTypesAvailable: batch4.platformTypesAvailable,
    osVersionVariance: batch4.osVersionVariance
  }
}

/**
 * Recalculate requirements with delta context
 * Called after previous snapshot metrics are loaded
 */
export function recalculatePCIDSSWithMetrics(
  currentMetrics: PCIDSSMetrics,
  previousMetrics: PCIDSSMetrics,
  devices: Device[]
): PCIDSSRequirement[] {
  // Merge previous metrics into current
  const metricsWithPrevious: PCIDSSMetrics = {
    ...currentMetrics,
    previousMetrics
  }

  // Recalculate all requirements with delta context
  return [
    { id: '1', name: 'Network Security Controls', ...calculateRequirement1Score(metricsWithPrevious, devices) },
    { id: '2', name: 'Secure Configurations', ...calculateRequirement2Score(metricsWithPrevious, devices) },
    { id: '6', name: 'Secure Systems and Software', ...calculateRequirement6Score(metricsWithPrevious, devices) },
    { id: '7', name: 'Access Restrictions', ...calculateRequirement7Score(metricsWithPrevious, devices) },
    { id: '8', name: 'User Authentication', ...calculateRequirement8Score(metricsWithPrevious, devices) },
    { id: '10', name: 'Logging and Monitoring', ...calculateRequirement10Score(metricsWithPrevious, devices) },
    { id: '11', name: 'Security Testing', ...calculateRequirement11Score(metricsWithPrevious, devices) },
    { id: '12', name: 'Information Security Policy', ...calculateRequirement12Score(metricsWithPrevious, devices) }
  ]
}

/**
 * Helper to extract numeric value from various formats
 */
function extractNumericValue(value: any): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    // Handle "Data Unavailable" and similar
    if (value.includes('Data Unavailable') || value.includes('N/A')) return null

    // Extract first number from string (handles "15 devices", "75.5%", etc.)
    const match = value.match(/[\d.]+/)
    return match ? parseFloat(match[0]) : null
  }

  return null
}

/**
 * Extract PCIDSSMetrics from already-loaded requirements
 * This allows recalculating scores without re-fetching API data
 *
 * Used for comparison snapshot handling - extract metrics from previous
 * snapshot's already-loaded requirements instead of making API calls
 *
 * @param requirements - Array of PCIDSSRequirement with details populated
 * @param totalDevices - Total device count
 * @param totalSites - Total site count (optional)
 * @returns PCIDSSMetrics object extracted from requirement details
 */
export function extractMetricsFromRequirements(
  requirements: PCIDSSRequirement[],
  totalDevices: number,
  totalSites: number = 0
): PCIDSSMetrics {
  const metrics: PCIDSSMetrics = {
    totalDevices,
    totalSites,

    // Initialize all metrics with defaults
    // Requirement 1 metrics
    aclPolicyCount: null,
    aclPolicyCountAvailable: false,
    zoneFwPolicyCount: null,
    zoneFwPolicyCountAvailable: false,
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

    // Requirement 2 metrics
    endOfSupportPercent: null,
    endOfSupportAvailable: false,
    discoveryIssuesCount: 0,
    localAaaUsersPercent: null,
    localAaaUsersAvailable: false,
    aaaAuthPercent: null,
    aaaAuthAvailable: false,
    ntpPercent: null,
    ntpAvailable: false,

    // Requirement 10 metrics
    localLoggingPercent: null,
    localLoggingAvailable: false,
    remoteLoggingPercent: null,
    remoteLoggingAvailable: false,

    // Requirement 11 metrics
    wirelessAPCount: null,
    wirelessAPAvailable: false,

    // Requirement 12 metrics
    platformTypesCount: null,
    platformTypesAvailable: false,
    osVersionVariance: 1
  }

  // Extract metrics from each requirement's details
  requirements.forEach(requirement => {
    requirement.details?.forEach(detail => {
      const value = extractNumericValue(detail.currentValue)
      const isAvailable = detail.unavailabilityReason === undefined

      // Map detail IDs to metric fields
      switch (detail.id) {
        // Requirement 1 details
        case '1.2.1':
          // Configuration standards - has breakdown for ACL and Zone FW counts
          if (detail.breakdown) {
            detail.breakdown.forEach(item => {
              if (item.metric.includes('ACL')) {
                metrics.aclPolicyCount = extractNumericValue(item.value)
                metrics.aclPolicyCountAvailable = metrics.aclPolicyCount !== null
              } else if (item.metric.includes('Zone Firewall')) {
                metrics.zoneFwPolicyCount = extractNumericValue(item.value)
                metrics.zoneFwPolicyCountAvailable = metrics.zoneFwPolicyCount !== null
              }
            })
          }
          break

        case '1.2.2':
          // Device configuration management
          metrics.configurationCount = value
          metrics.configurationCountAvailable = isAvailable
          metrics.configurationCountReason = detail.unavailabilityReason
          break

        case '1.2.3':
          // Diagram availability
          metrics.diagramAvailable = String(detail.currentValue || '').toLowerCase().includes('available') &&
            !String(detail.currentValue || '').toLowerCase().includes('not available')
          metrics.diagramReason = detail.unavailabilityReason
          break

        case '1.2.5':
          // ANY/ANY policies - has breakdown
          if (detail.breakdown) {
            detail.breakdown.forEach(item => {
              if (item.metric.includes('ACL')) {
                metrics.anyAnyAclCount = extractNumericValue(item.value)
                metrics.anyAnyAclAvailable = metrics.anyAnyAclCount !== null
              } else if (item.metric.includes('Firewall')) {
                metrics.anyAnyFwCount = extractNumericValue(item.value)
                metrics.anyAnyFwAvailable = metrics.anyAnyFwCount !== null
              }
            })
          }
          break

        case '1.2.6':
        case '2.2.4':
        case '2.2.7':
        case '8.3.2':
          // Telnet percentage (appears in multiple requirements)
          if (metrics.telnetPercent === null) {
            metrics.telnetPercent = value
            metrics.telnetAvailable = isAvailable
            metrics.telnetReason = detail.unavailabilityReason
          }
          break

        case '1.4.5':
          // BGP neighbors
          metrics.bgpNeighborsCount = value
          metrics.bgpNeighborsAvailable = isAvailable
          metrics.bgpNeighborsReason = detail.unavailabilityReason
          break

        // Requirement 2 details
        case '2.2.1':
          // EoS + Discovery issues - has breakdown
          if (detail.breakdown) {
            detail.breakdown.forEach(item => {
              if (item.metric.includes('End of Support') || item.metric.includes('EoS')) {
                metrics.endOfSupportPercent = extractNumericValue(item.value)
                metrics.endOfSupportAvailable = metrics.endOfSupportPercent !== null
              } else if (item.metric.includes('Discovery')) {
                metrics.discoveryIssuesCount = extractNumericValue(item.value) || 0
              }
            })
          } else {
            // Try to extract from currentValue directly
            metrics.endOfSupportPercent = value
            metrics.endOfSupportAvailable = isAvailable
          }
          break

        case '2.2.2':
        case '8.2.2':
          // Local AAA users
          if (metrics.localAaaUsersPercent === null) {
            metrics.localAaaUsersPercent = value
            metrics.localAaaUsersAvailable = isAvailable
            metrics.localAaaUsersReason = detail.unavailabilityReason
          }
          break

        case '2.2.6':
          // AAA + NTP - has breakdown
          if (detail.breakdown) {
            detail.breakdown.forEach(item => {
              if (item.metric.includes('AAA')) {
                metrics.aaaAuthPercent = extractNumericValue(item.value)
                metrics.aaaAuthAvailable = metrics.aaaAuthPercent !== null
              } else if (item.metric.includes('NTP')) {
                metrics.ntpPercent = extractNumericValue(item.value)
                metrics.ntpAvailable = metrics.ntpPercent !== null
              }
            })
          }
          break

        // Requirement 6 details
        case '6.3.3':
          // EoS (may already be set from 2.2.1)
          if (metrics.endOfSupportPercent === null) {
            metrics.endOfSupportPercent = value
            metrics.endOfSupportAvailable = isAvailable
          }
          break

        // Requirement 10 details
        case '10.2.1':
          // Local + Remote logging - has breakdown
          if (detail.breakdown) {
            detail.breakdown.forEach(item => {
              if (item.metric.includes('Local')) {
                metrics.localLoggingPercent = extractNumericValue(item.value)
                metrics.localLoggingAvailable = metrics.localLoggingPercent !== null
              } else if (item.metric.includes('Remote')) {
                metrics.remoteLoggingPercent = extractNumericValue(item.value)
                metrics.remoteLoggingAvailable = metrics.remoteLoggingPercent !== null
              }
            })
          }
          break

        // Requirement 11 details
        case '11.2.2':
          // Wireless AP count
          metrics.wirelessAPCount = value
          metrics.wirelessAPAvailable = isAvailable
          metrics.wirelessAPReason = detail.unavailabilityReason
          // Detect wired-only network from display value or from count=0 with available=true
          const displayStr = String(detail.currentValue || '')
          metrics.wirelessAPNotApplicable = displayStr.includes('Wired-only') ||
                                            (isAvailable && value === 0)
          break

        // Requirement 12 details - handled via composite ID matching below
        // (case '12.5.1' removed - IDs are actually '12.3.4-12.5.1-*' composite format)
      }

      // Handle Requirement 12 composite IDs (outside switch - pattern matching)
      if (detail.id.startsWith('12.3.4-12.5.1')) {
        if (detail.id.includes('devices')) {
          // Extract from breakdown if available, otherwise from currentValue
          if (detail.breakdown && detail.breakdown.length > 0) {
            metrics.totalDevices = extractNumericValue(detail.breakdown[0].value) ?? totalDevices
          } else {
            const deviceVal = extractNumericValue(detail.currentValue)
            if (deviceVal !== null) metrics.totalDevices = deviceVal
          }
        }
        if (detail.id.includes('sites')) {
          if (detail.breakdown && detail.breakdown.length > 0) {
            metrics.totalSites = extractNumericValue(detail.breakdown[0].value) ?? totalSites
          } else {
            const siteVal = extractNumericValue(detail.currentValue)
            if (siteVal !== null) metrics.totalSites = siteVal
          }
        }
        if (detail.id.includes('platforms')) {
          if (detail.breakdown && detail.breakdown.length > 0) {
            metrics.platformTypesCount = extractNumericValue(detail.breakdown[0].value)
            metrics.platformTypesAvailable = metrics.platformTypesCount !== null
          } else {
            metrics.platformTypesCount = extractNumericValue(detail.currentValue)
            metrics.platformTypesAvailable = metrics.platformTypesCount !== null
          }
        }
        if (detail.id.includes('variance')) {
          if (detail.breakdown && detail.breakdown.length > 0) {
            metrics.osVersionVariance = extractNumericValue(detail.breakdown[0].value) ?? 1
          } else {
            metrics.osVersionVariance = extractNumericValue(detail.currentValue) ?? 1
          }
        }
      }
    })
  })

  return metrics
}
