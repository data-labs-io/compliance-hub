/**
 * NIS2 Directive Calculator
 * Implements scoring logic for NIS2 Articles 21 and 27
 * Based on NIS2-rapid-analysis-mockup-v5.pdf from IP Fabric
 *
 * Articles:
 * - 21.2.B: Incident Handling (60 points, 12 checks)
 * - 21.2.C: Business Continuity (25 points, 5 checks)
 * - 21.2.D: Supply Chain Security (20 points, 4 checks)
 * - 21.2.E: Vulnerability Handling (5 points, 1 check)
 * - 21.2.F: Risk Management Assessment (30 points, 6 checks)
 * - 21.2.H: Cryptography & Encryption (10 points, 2 checks)
 * - 21.2.I: Access Control & Asset Management (35 points, 7 checks)
 * - 27.2.F: Entity IP Ranges (15 points, 3 checks)
 *
 * Total: 200 points max
 */

import { Device } from '@/lib/device-generator'
import type { NIS2Metrics, NIS2Article, NIS2CheckDetail, NIS2PreviousMetrics } from './types'
import {
  fetchDiscoveryErrors,
  fetchSiteCount,
  fetchPlatformTypes,
  fetchEndOfSupportSummary,
  fetchAaaPercentage,
  fetchTelnetPercentage,
  fetchLocalLoggingPercentage,
  fetchRemoteLoggingPercentage,
  fetchNtpPercentage,
  fetchDnsCoverage,
  fetchDnsServersCount,
  fetchAnyAnyAclCount,
  fetchBgpNeighborsCount,
  fetchRoutesCount,
  fetchIPv6RoutesCount,
  fetch8021xPercentage,
  fetchZoneFirewallCount,
  fetchDiagramAvailability
} from '@/services/metrics-api'

// ============================================
// Main Entry Points
// ============================================

/**
 * Calculate all NIS2 articles with progressive loading
 * Emits batch callbacks as each batch completes
 */
export async function calculateNIS2Progressive(
  devices: Device[],
  snapshotId: string,
  intentChecksPassed: number,
  intentChecksFailed: number,
  apiCall?: (endpoint: string, options?: any) => Promise<any>,
  previousSnapshotId?: string | null,
  previousDevices?: Device[],
  onBatchComplete?: (batchNum: number, articles: NIS2Article[], totalBatches: number) => void
): Promise<NIS2Article[]> {
  if (!apiCall) {
    console.warn('[NIS2] No API call function provided')
    return []
  }

  const totalBatches = 4
  const totalDevices = devices.length
  let allArticles: NIS2Article[] = []
  let accumulatedMetrics: Partial<NIS2Metrics> = {
    totalDevices,
    totalSites: 0,
    // Initialize all metrics as unavailable
    deviceCount: totalDevices,
    deviceCountAvailable: true,
    siteCount: null,
    siteCountAvailable: false,
    ntpPercent: null,
    ntpAvailable: false,
    ipv4DnsCoveragePercent: null,
    ipv4DnsCoverageAvailable: false,
    dnsServersCount: null,
    dnsServersAvailable: false,
    localLoggingPercent: null,
    localLoggingAvailable: false,
    remoteLoggingPercent: null,
    remoteLoggingAvailable: false,
    configurationCount: null,
    configurationCountAvailable: false,
    aclPolicyCount: null,
    aclPolicyCountAvailable: false,
    zoneFwPolicyCount: null,
    zoneFwPolicyCountAvailable: false,
    ebgpNeighborsCount: null,
    ebgpNeighborsAvailable: false,
    diagramAvailable: false,
    discoveryIssues: 0,
    discoveryIssuesAvailable: false,
    uniquePlatforms: null,
    uniquePlatformsAvailable: false,
    endOfSupportPercent: null,
    endOfSupportAvailable: false,
    aaaPercent: null,
    aaaAvailable: false,
    telnetPercent: null,
    telnetAvailable: false,
    anyAnyAclCount: null,
    anyAnyAclAvailable: false,
    anyAnyFwCount: null,
    anyAnyFwAvailable: false,
    securePortsPercent: null,
    securePortsAvailable: false,
    ipv4RoutesCount: null,
    ipv4RoutesAvailable: false,
    ipv6RoutesCount: null,
    ipv6RoutesAvailable: false
  }

  // Fetch previous metrics if comparison is enabled
  if (previousSnapshotId) {
    const prevMetrics = await fetchPreviousNIS2Metrics(previousSnapshotId, previousDevices || devices, apiCall)
    accumulatedMetrics.previousMetrics = prevMetrics
  }

  // ============================================
  // BATCH 1: Foundation (21.2.B + 21.2.C)
  // ============================================
  try {
    const batch1Metrics = await fetchBatch1Metrics(snapshotId, totalDevices, apiCall)
    accumulatedMetrics = { ...accumulatedMetrics, ...batch1Metrics }

    const art21B = { id: '21.2.B', name: 'Incident Handling', ...calculateArticle21BScore(accumulatedMetrics as NIS2Metrics) }
    const art21C = { id: '21.2.C', name: 'Business Continuity', ...calculateArticle21CScore(accumulatedMetrics as NIS2Metrics) }

    allArticles.push(art21B, art21C)

    if (onBatchComplete) {
      onBatchComplete(1, [...allArticles], totalBatches)
    }
  } catch (error) {
    console.error('[NIS2] Batch 1 error:', error)
  }

  // ============================================
  // BATCH 2: Security Policies (21.2.D + 21.2.E)
  // ============================================
  try {
    const batch2Metrics = await fetchBatch2Metrics(snapshotId, totalDevices, apiCall)
    accumulatedMetrics = { ...accumulatedMetrics, ...batch2Metrics }

    const art21D = { id: '21.2.D', name: 'Supply Chain Security', ...calculateArticle21DScore(accumulatedMetrics as NIS2Metrics) }
    const art21E = { id: '21.2.E', name: 'Vulnerability Handling', ...calculateArticle21EScore(accumulatedMetrics as NIS2Metrics) }

    const dIdx = allArticles.findIndex(a => a.id === '21.2.D')
    if (dIdx >= 0) allArticles[dIdx] = art21D; else allArticles.push(art21D)
    const eIdx = allArticles.findIndex(a => a.id === '21.2.E')
    if (eIdx >= 0) allArticles[eIdx] = art21E; else allArticles.push(art21E)

    if (onBatchComplete) {
      onBatchComplete(2, [...allArticles], totalBatches)
    }
  } catch (error) {
    console.error('[NIS2] Batch 2 error:', error)
  }

  // ============================================
  // BATCH 3: Assessment & Crypto (21.2.F + 21.2.H)
  // ============================================
  try {
    const batch3Metrics = await fetchBatch3Metrics(snapshotId, totalDevices, apiCall)
    accumulatedMetrics = { ...accumulatedMetrics, ...batch3Metrics }

    const art21F = { id: '21.2.F', name: 'Risk Management Assessment', ...calculateArticle21FScore(accumulatedMetrics as NIS2Metrics) }
    const art21H = { id: '21.2.H', name: 'Cryptography & Encryption', ...calculateArticle21HScore(accumulatedMetrics as NIS2Metrics) }

    const fIdx = allArticles.findIndex(a => a.id === '21.2.F')
    if (fIdx >= 0) allArticles[fIdx] = art21F; else allArticles.push(art21F)
    const hIdx = allArticles.findIndex(a => a.id === '21.2.H')
    if (hIdx >= 0) allArticles[hIdx] = art21H; else allArticles.push(art21H)

    if (onBatchComplete) {
      onBatchComplete(3, [...allArticles], totalBatches)
    }
  } catch (error) {
    console.error('[NIS2] Batch 3 error:', error)
  }

  // ============================================
  // BATCH 4: Access & Registration (21.2.I + 27.2.F)
  // ============================================
  try {
    const batch4Metrics = await fetchBatch4Metrics(snapshotId, totalDevices, apiCall)
    accumulatedMetrics = { ...accumulatedMetrics, ...batch4Metrics }

    const art21I = { id: '21.2.I', name: 'Access Control & Asset Management', ...calculateArticle21IScore(accumulatedMetrics as NIS2Metrics) }
    const art27F = { id: '27.2.F', name: 'Entity IP Ranges', ...calculateArticle27FScore(accumulatedMetrics as NIS2Metrics) }

    const iIdx = allArticles.findIndex(a => a.id === '21.2.I')
    if (iIdx >= 0) allArticles[iIdx] = art21I; else allArticles.push(art21I)
    const fIdx2 = allArticles.findIndex(a => a.id === '27.2.F')
    if (fIdx2 >= 0) allArticles[fIdx2] = art27F; else allArticles.push(art27F)

    if (onBatchComplete) {
      onBatchComplete(4, [...allArticles], totalBatches)
    }
  } catch (error) {
    console.error('[NIS2] Batch 4 error:', error)
  }

  // Ensure correct order
  const orderedIds = ['21.2.B', '21.2.C', '21.2.D', '21.2.E', '21.2.F', '21.2.H', '21.2.I', '27.2.F']
  return orderedIds
    .map(id => allArticles.find(a => a.id === id))
    .filter((a): a is NIS2Article => a !== undefined)
}

/**
 * Calculate overall NIS2 score as percentage
 */
export function calculateOverallNIS2Score(articles: NIS2Article[]): number {
  const totalScore = articles.reduce((sum, a) => sum + a.score, 0)
  const maxScore = articles.reduce((sum, a) => sum + a.maxScore, 0)
  const percentage = Math.round((totalScore / maxScore) * 1000) / 10
  return percentage
}

// ============================================
// Batch Metric Fetchers
// ============================================

async function fetchBatch1Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<NIS2Metrics>> {
  const metrics: Partial<NIS2Metrics> = {}

  // Sites
  const siteResult = await fetchSiteCount(snapshotId, apiCall)
  metrics.siteCount = siteResult.value
  metrics.siteCountAvailable = siteResult.available
  metrics.siteCountReason = siteResult.reason
  metrics.totalSites = siteResult.value ?? 0

  // NTP
  const ntpResult = await fetchNtpPercentage(snapshotId, totalDevices, apiCall)
  metrics.ntpPercent = ntpResult.value
  metrics.ntpAvailable = ntpResult.available
  metrics.ntpReason = ntpResult.reason

  // IPv4 DNS coverage
  const dnsResult = await fetchDnsCoverage(snapshotId, totalDevices, apiCall)
  metrics.ipv4DnsCoveragePercent = dnsResult.value
  metrics.ipv4DnsCoverageAvailable = dnsResult.available
  metrics.ipv4DnsCoverageReason = dnsResult.reason

  // DNS resolvers
  const dnsServersResult = await fetchDnsServersCount(snapshotId, apiCall)
  metrics.dnsServersCount = dnsServersResult.value
  metrics.dnsServersAvailable = dnsServersResult.available
  metrics.dnsServersReason = dnsServersResult.reason

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

  // ACL Policy count (active)
  try {
    const aclResponse = await apiCall('tables/security/acl', {
      method: 'POST',
      body: {
        columns: ['hostname', 'name', 'active'],
        filters: { active: ['neq', 0] },
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

  // Zone Firewall Policy count (active)
  const zoneFwResult = await fetchZoneFirewallCount(snapshotId, apiCall)
  metrics.zoneFwPolicyCount = zoneFwResult.value
  metrics.zoneFwPolicyCountAvailable = zoneFwResult.available
  metrics.zoneFwPolicyCountReason = zoneFwResult.reason

  // eBGP Neighbours
  const bgpResult = await fetchBgpNeighborsCount(snapshotId, apiCall)
  metrics.ebgpNeighborsCount = bgpResult.value
  metrics.ebgpNeighborsAvailable = bgpResult.available
  metrics.ebgpNeighborsReason = bgpResult.reason

  // Diagram availability
  const diagramResult = await fetchDiagramAvailability(snapshotId, apiCall)
  metrics.diagramAvailable = diagramResult.value || false
  metrics.diagramReason = diagramResult.reason

  // Discovery Issues
  const discoveryResult = await fetchDiscoveryErrors(snapshotId, apiCall)
  metrics.discoveryIssues = discoveryResult.data?.count || 0
  metrics.discoveryIssuesAvailable = discoveryResult.availability?.available ?? true
  metrics.discoveryIssuesReason = discoveryResult.availability?.impact

  // Unique platforms
  const platformResult = await fetchPlatformTypes(snapshotId, apiCall)
  metrics.uniquePlatforms = platformResult.value
  metrics.uniquePlatformsAvailable = platformResult.available
  metrics.uniquePlatformsReason = platformResult.reason

  return metrics
}

async function fetchBatch2Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<NIS2Metrics>> {
  const metrics: Partial<NIS2Metrics> = {}

  // End of Support
  const eosData = await fetchEndOfSupportSummary(snapshotId, totalDevices, apiCall)
  if (eosData) {
    metrics.endOfSupportPercent = eosData.percentage
    metrics.endOfSupportAvailable = true
  } else {
    metrics.endOfSupportPercent = null
    metrics.endOfSupportAvailable = false
    metrics.endOfSupportReason = 'End of Support data not available'
  }

  // 21.2.D reuses ACL, Zone FW, eBGP, Diagram from Batch 1
  return metrics
}

async function fetchBatch3Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<NIS2Metrics>> {
  const metrics: Partial<NIS2Metrics> = {}

  // AAA (TACACS/RADIUS)
  const aaaResult = await fetchAaaPercentage(snapshotId, totalDevices, apiCall)
  metrics.aaaPercent = aaaResult.value
  metrics.aaaAvailable = aaaResult.available
  metrics.aaaReason = aaaResult.reason

  // Telnet enabled
  const telnetResult = await fetchTelnetPercentage(snapshotId, totalDevices, apiCall)
  metrics.telnetPercent = telnetResult.value
  metrics.telnetAvailable = telnetResult.available
  metrics.telnetReason = telnetResult.reason

  // ANY/ANY ACL count
  const anyAnyAclResult = await fetchAnyAnyAclCount(snapshotId, apiCall)
  metrics.anyAnyAclCount = anyAnyAclResult.value
  metrics.anyAnyAclAvailable = anyAnyAclResult.available
  metrics.anyAnyAclReason = anyAnyAclResult.reason

  // ANY/ANY FW count
  try {
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

  // 802.1x
  const securePortsResult = await fetch8021xPercentage(snapshotId, apiCall)
  metrics.securePortsPercent = securePortsResult.value
  metrics.securePortsAvailable = securePortsResult.available
  metrics.securePortsReason = securePortsResult.reason

  return metrics
}

async function fetchBatch4Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<NIS2Metrics>> {
  const metrics: Partial<NIS2Metrics> = {}

  // IPv4 routes
  const ipv4Result = await fetchRoutesCount(snapshotId, apiCall)
  metrics.ipv4RoutesCount = ipv4Result.value
  metrics.ipv4RoutesAvailable = ipv4Result.available
  metrics.ipv4RoutesReason = ipv4Result.reason

  // IPv6 routes
  const ipv6Result = await fetchIPv6RoutesCount(snapshotId, apiCall)
  metrics.ipv6RoutesCount = ipv6Result.value
  metrics.ipv6RoutesAvailable = ipv6Result.available
  metrics.ipv6RoutesReason = ipv6Result.reason

  // 21.2.I reuses ACL, Zone FW, AAA, Devices, Config, EoS, Discovery from earlier batches
  return metrics
}

/**
 * Fetch previous snapshot metrics for delta calculations
 */
async function fetchPreviousNIS2Metrics(
  previousSnapshotId: string,
  previousDevices: Device[],
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<NIS2PreviousMetrics> {
  const prevTotalDevices = previousDevices.length
  const prev: NIS2PreviousMetrics = { totalDevices: prevTotalDevices }

  try {
    const siteResult = await fetchSiteCount(previousSnapshotId, apiCall)
    prev.siteCount = siteResult.value

    const ntpResult = await fetchNtpPercentage(previousSnapshotId, prevTotalDevices, apiCall)
    prev.ntpPercent = ntpResult.value

    const dnsResult = await fetchDnsCoverage(previousSnapshotId, prevTotalDevices, apiCall)
    prev.ipv4DnsCoveragePercent = dnsResult.value

    const dnsServersResult = await fetchDnsServersCount(previousSnapshotId, apiCall)
    prev.dnsServersCount = dnsServersResult.value

    const localLogResult = await fetchLocalLoggingPercentage(previousSnapshotId, prevTotalDevices, apiCall)
    prev.localLoggingPercent = localLogResult.value

    const remoteLogResult = await fetchRemoteLoggingPercentage(previousSnapshotId, prevTotalDevices, apiCall)
    prev.remoteLoggingPercent = remoteLogResult.value

    // Config count
    try {
      const configResponse = await apiCall('tables/management/configuration', {
        method: 'POST',
        body: { columns: ['hostname'], snapshot: previousSnapshotId, pagination: { limit: 5000, start: 0 } }
      })
      prev.configurationCount = configResponse?._meta?.size || 0
    } catch { prev.configurationCount = null }

    // ACL count
    // NOTE: use the same column shape that fetchAnyAnyAclCount / the PCI-DSS
    // calculator use. `name` is not a valid column on /tables/security/acl
    // (it's `policyName`), and `filters: { active: ['neq', 0] }` is not a
    // valid filter tuple for a boolean field — together they produce a 422.
    try {
      const aclResponse = await apiCall('tables/security/acl', {
        method: 'POST',
        body: {
          columns: ['hostname', 'policyName', 'action'],
          snapshot: previousSnapshotId,
          pagination: { limit: 5000, start: 0 }
        }
      })
      if (aclResponse && !aclResponse._error && aclResponse._meta) {
        prev.aclPolicyCount = aclResponse._meta.size || 0
      } else {
        prev.aclPolicyCount = null
      }
    } catch {
      prev.aclPolicyCount = null
    }

    const zoneFwResult = await fetchZoneFirewallCount(previousSnapshotId, apiCall)
    prev.zoneFwPolicyCount = zoneFwResult.value

    const bgpResult = await fetchBgpNeighborsCount(previousSnapshotId, apiCall)
    prev.ebgpNeighborsCount = bgpResult.value

    const discoveryResult = await fetchDiscoveryErrors(previousSnapshotId, apiCall)
    prev.discoveryIssues = discoveryResult.data?.count || 0

    const eosData = await fetchEndOfSupportSummary(previousSnapshotId, prevTotalDevices, apiCall)
    prev.endOfSupportPercent = eosData?.percentage ?? null

    const aaaResult = await fetchAaaPercentage(previousSnapshotId, prevTotalDevices, apiCall)
    prev.aaaPercent = aaaResult.value

    const telnetResult = await fetchTelnetPercentage(previousSnapshotId, prevTotalDevices, apiCall)
    prev.telnetPercent = telnetResult.value

    const anyAnyAclResult = await fetchAnyAnyAclCount(previousSnapshotId, apiCall)
    prev.anyAnyAclCount = anyAnyAclResult.value

    // ANY/ANY FW
    try {
      const anyAnyFwResponse = await apiCall('tables/security/zone-firewall/policies', {
        method: 'POST',
        body: { columns: ['hostname', 'action', 'active'], filters: { active: ['eq', true] }, snapshot: previousSnapshotId, pagination: { limit: 5000, start: 0 } }
      })
      prev.anyAnyFwCount = anyAnyFwResponse?._meta?.size || 0
    } catch { prev.anyAnyFwCount = null }

    const securePortsResult = await fetch8021xPercentage(previousSnapshotId, apiCall)
    prev.securePortsPercent = securePortsResult.value

    const ipv4Result = await fetchRoutesCount(previousSnapshotId, apiCall)
    prev.ipv4RoutesCount = ipv4Result.value

    const ipv6Result = await fetchIPv6RoutesCount(previousSnapshotId, apiCall)
    prev.ipv6RoutesCount = ipv6Result.value

    const platformResult = await fetchPlatformTypes(previousSnapshotId, apiCall)
    prev.uniquePlatforms = platformResult.value
  } catch (error) {
    console.error('[NIS2] Error fetching previous metrics:', error)
  }

  return prev
}

// ============================================
// Scoring Functions - Per Article
// ============================================

// Helper: calculate delta direction
function getDeltaDirection(current: number | null | undefined, previous: number | null | undefined, reversePolarity = false): 'positive' | 'negative' | 'neutral' {
  if (current == null || previous == null) return 'neutral'
  const diff = current - previous
  if (diff === 0) return 'neutral'
  if (reversePolarity) return diff < 0 ? 'positive' : 'negative'
  return diff > 0 ? 'positive' : 'negative'
}

// Helper: boolean score (if both A and B > 0, score 5, else 0)
function booleanPresenceScore(currentVal: number | null | undefined, available: boolean, maxPts: number): number {
  if (!available || currentVal == null || currentVal <= 0) return 0
  return maxPts
}

// Helper: percentage score (percent / 100 * maxPts)
function percentScore(percent: number | null | undefined, available: boolean, maxPts: number): number {
  if (!available || percent == null) return 0
  return Math.min(maxPts, (percent / 100) * maxPts)
}

// Helper: inverse percentage score (100 - percent) / 100 * maxPts
function inversePercentScore(percent: number | null | undefined, available: boolean, maxPts: number): number {
  if (!available || percent == null) return 0
  return Math.min(maxPts, ((100 - percent) / 100) * maxPts)
}

// Helper: delta >= 0 score (if both snapshots have data and delta >= 0, full score)
function deltaGteZeroScore(current: number | null | undefined, previous: number | null | undefined, currentAvailable: boolean, maxPts: number): number {
  if (!currentAvailable || current == null) return 0
  if (previous == null || previous === undefined) {
    // No previous snapshot; score based on having data
    return current > 0 ? maxPts : 0
  }
  if (current > 0 && previous > 0 && (current - previous) >= 0) return maxPts
  if (current > 0 && previous <= 0) return 0
  if (current <= 0) return 0
  return 0 // delta < 0
}

// Helper: delta <= 0 score (for metrics where decrease is good)
function deltaLteZeroScore(current: number | null | undefined, previous: number | null | undefined, currentAvailable: boolean, maxPts: number): number {
  if (!currentAvailable || current == null) return 0
  if (previous == null || previous === undefined) {
    return maxPts // No comparison, give full score if data available
  }
  return (current - previous) <= 0 ? maxPts : 0
}

// Helper: discovery issues tiered score
function discoveryIssuesTieredScore(count: number, maxPts: number): number {
  if (count === 0) return maxPts
  if (count <= 10) return Math.max(0, maxPts - 1)
  if (count <= 20) return Math.max(0, maxPts - 2)
  if (count <= 30) return Math.max(0, maxPts - 3)
  if (count <= 40) return Math.max(0, maxPts - 4)
  return 0
}

// Helper: get status from score
function getStatus(score: number, maxScore: number): 'pass' | 'warning' {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0
  return pct >= 70 ? 'pass' : 'warning'
}

/**
 * Article 21.2.B - Incident Handling
 * 12 checks × 5 points = 60 points max
 */
function calculateArticle21BScore(metrics: NIS2Metrics): Omit<NIS2Article, 'id' | 'name'> {
  const maxScore = 60
  const prev = metrics.previousMetrics
  const details: NIS2CheckDetail[] = []

  // 1. Devices (boolean presence, 5 pts)
  const devScore = booleanPresenceScore(metrics.deviceCount, metrics.deviceCountAvailable, 5)
  details.push({
    id: '21.2.B-devices',
    name: 'Device Inventory',
    ipFabricContext: 'Automatic discovery and inventory for all network devices',
    maxPoints: 5,
    currentValue: metrics.deviceCount || 0,
    previousValue: prev?.totalDevices,
    delta: prev?.totalDevices != null ? (metrics.deviceCount || 0) - prev.totalDevices : undefined,
    deltaDirection: getDeltaDirection(metrics.deviceCount, prev?.totalDevices),
    calculatedPoints: Math.round(devScore * 100) / 100,
    scoringRule: 'Full score if device inventory returns data (> 0 devices)'
  })

  // 2. Sites (boolean presence, 5 pts)
  const siteScore = booleanPresenceScore(metrics.siteCount, metrics.siteCountAvailable, 5)
  details.push({
    id: '21.2.B-sites',
    name: 'Site Inventory',
    ipFabricContext: 'Network sites contextualisation',
    maxPoints: 5,
    currentValue: metrics.siteCount ?? 'N/A',
    previousValue: prev?.siteCount ?? undefined,
    delta: prev?.siteCount != null && metrics.siteCount != null ? metrics.siteCount - prev.siteCount : undefined,
    deltaDirection: getDeltaDirection(metrics.siteCount, prev?.siteCount),
    calculatedPoints: Math.round(siteScore * 100) / 100,
    scoringRule: 'Full score if site inventory returns data (> 0 sites)'
  })

  // 3. NTP (percent, 5 pts)
  const ntpScore = percentScore(metrics.ntpPercent, metrics.ntpAvailable, 5)
  details.push({
    id: '21.2.B-ntp',
    name: 'NTP Configured and Synchronised',
    ipFabricContext: 'NTP sources and synchronization state per device',
    maxPoints: 5,
    currentValue: metrics.ntpPercent != null ? `${metrics.ntpPercent}%` : 'N/A',
    previousValue: prev?.ntpPercent != null ? `${prev.ntpPercent}%` : undefined,
    delta: prev?.ntpPercent != null && metrics.ntpPercent != null ? `${(metrics.ntpPercent - prev.ntpPercent).toFixed(1)}%` : undefined,
    deltaDirection: getDeltaDirection(metrics.ntpPercent, prev?.ntpPercent),
    calculatedPoints: Math.round(ntpScore * 100) / 100,
    scoringRule: 'Percentage of devices with NTP × max 5 points. Target: 100%'
  })

  // 4. IPv4 DNS coverage (percent, 5 pts)
  const dnsScore = percentScore(metrics.ipv4DnsCoveragePercent, metrics.ipv4DnsCoverageAvailable, 5)
  details.push({
    id: '21.2.B-dns-coverage',
    name: 'IPv4 Addresses in DNS',
    ipFabricContext: 'Forward and reverse DNS entries for infrastructure device IPs',
    maxPoints: 5,
    currentValue: metrics.ipv4DnsCoveragePercent != null ? `${metrics.ipv4DnsCoveragePercent}%` : 'N/A',
    previousValue: prev?.ipv4DnsCoveragePercent != null ? `${prev.ipv4DnsCoveragePercent}%` : undefined,
    delta: prev?.ipv4DnsCoveragePercent != null && metrics.ipv4DnsCoveragePercent != null ? `${(metrics.ipv4DnsCoveragePercent - prev.ipv4DnsCoveragePercent).toFixed(1)}%` : undefined,
    deltaDirection: getDeltaDirection(metrics.ipv4DnsCoveragePercent, prev?.ipv4DnsCoveragePercent),
    calculatedPoints: Math.round(dnsScore * 100) / 100,
    scoringRule: 'Percentage of IPs with forward+reverse DNS × max 5 points. Target: 100%'
  })

  // 5. DNS resolvers (boolean presence, 5 pts)
  const dnsResolverScore = booleanPresenceScore(metrics.dnsServersCount, metrics.dnsServersAvailable, 5)
  details.push({
    id: '21.2.B-dns-resolvers',
    name: 'DNS Resolvers Configured',
    ipFabricContext: 'DNS servers configured on managed network devices',
    maxPoints: 5,
    currentValue: metrics.dnsServersCount ?? 'N/A',
    previousValue: prev?.dnsServersCount ?? undefined,
    delta: prev?.dnsServersCount != null && metrics.dnsServersCount != null ? metrics.dnsServersCount - prev.dnsServersCount : undefined,
    deltaDirection: getDeltaDirection(metrics.dnsServersCount, prev?.dnsServersCount),
    calculatedPoints: Math.round(dnsResolverScore * 100) / 100,
    scoringRule: 'Full score if DNS resolvers are configured (count > 0)'
  })

  // 6. Local Logging (percent, 5 pts)
  const localLogScore = percentScore(metrics.localLoggingPercent, metrics.localLoggingAvailable, 5)
  details.push({
    id: '21.2.B-local-logging',
    name: 'Local Logging',
    ipFabricContext: 'Devices with local system message logging configured',
    maxPoints: 5,
    currentValue: metrics.localLoggingPercent != null ? `${metrics.localLoggingPercent}%` : 'N/A',
    previousValue: prev?.localLoggingPercent != null ? `${prev.localLoggingPercent}%` : undefined,
    delta: prev?.localLoggingPercent != null && metrics.localLoggingPercent != null ? `${(metrics.localLoggingPercent - prev.localLoggingPercent).toFixed(1)}%` : undefined,
    deltaDirection: getDeltaDirection(metrics.localLoggingPercent, prev?.localLoggingPercent),
    calculatedPoints: Math.round(localLogScore * 100) / 100,
    scoringRule: 'Percentage of devices with local logging × max 5 points. Target: 100%'
  })

  // 7. Remote Logging (percent, 5 pts)
  const remoteLogScore = percentScore(metrics.remoteLoggingPercent, metrics.remoteLoggingAvailable, 5)
  details.push({
    id: '21.2.B-remote-logging',
    name: 'Remote Logging',
    ipFabricContext: 'Devices with remote syslog targets configured',
    maxPoints: 5,
    currentValue: metrics.remoteLoggingPercent != null ? `${metrics.remoteLoggingPercent}%` : 'N/A',
    previousValue: prev?.remoteLoggingPercent != null ? `${prev.remoteLoggingPercent}%` : undefined,
    delta: prev?.remoteLoggingPercent != null && metrics.remoteLoggingPercent != null ? `${(metrics.remoteLoggingPercent - prev.remoteLoggingPercent).toFixed(1)}%` : undefined,
    deltaDirection: getDeltaDirection(metrics.remoteLoggingPercent, prev?.remoteLoggingPercent),
    calculatedPoints: Math.round(remoteLogScore * 100) / 100,
    scoringRule: 'Percentage of devices with remote logging × max 5 points. Target: 100%'
  })

  // 8. Configuration Management (delta >= 0, 5 pts)
  const configScore = deltaGteZeroScore(metrics.configurationCount, prev?.configurationCount, metrics.configurationCountAvailable, 5)
  details.push({
    id: '21.2.B-config',
    name: 'Configuration Management',
    ipFabricContext: 'Configuration files tracked and compared between snapshots',
    maxPoints: 5,
    currentValue: metrics.configurationCount ?? 'N/A',
    previousValue: prev?.configurationCount ?? undefined,
    delta: prev?.configurationCount != null && metrics.configurationCount != null ? metrics.configurationCount - prev.configurationCount : undefined,
    deltaDirection: getDeltaDirection(metrics.configurationCount, prev?.configurationCount),
    calculatedPoints: Math.round(configScore * 100) / 100,
    scoringRule: 'Full score if config count > 0 in both snapshots and delta ≥ 0',
    requiresComparativeSnapshot: true
  })

  // 9. ACL Policies (delta >= 0, 5 pts)
  const aclScore = deltaGteZeroScore(metrics.aclPolicyCount, prev?.aclPolicyCount, metrics.aclPolicyCountAvailable, 5)
  details.push({
    id: '21.2.B-acl',
    name: 'ACL Policies',
    ipFabricContext: 'Enumerates access control list rulesets',
    maxPoints: 5,
    currentValue: metrics.aclPolicyCount ?? 'N/A',
    previousValue: prev?.aclPolicyCount ?? undefined,
    delta: prev?.aclPolicyCount != null && metrics.aclPolicyCount != null ? metrics.aclPolicyCount - prev.aclPolicyCount : undefined,
    deltaDirection: getDeltaDirection(metrics.aclPolicyCount, prev?.aclPolicyCount),
    calculatedPoints: Math.round(aclScore * 100) / 100,
    scoringRule: 'Full score if ACL count > 0 in both snapshots and delta ≥ 0',
    requiresComparativeSnapshot: true
  })

  // 10. Zone Firewall Policies (delta >= 0, 5 pts)
  const fwScore = deltaGteZeroScore(metrics.zoneFwPolicyCount, prev?.zoneFwPolicyCount, metrics.zoneFwPolicyCountAvailable, 5)
  details.push({
    id: '21.2.B-zonefw',
    name: 'Zone Firewall Policies',
    ipFabricContext: 'Enumerates zone firewall rulesets',
    maxPoints: 5,
    currentValue: metrics.zoneFwPolicyCount ?? 'N/A',
    previousValue: prev?.zoneFwPolicyCount ?? undefined,
    delta: prev?.zoneFwPolicyCount != null && metrics.zoneFwPolicyCount != null ? metrics.zoneFwPolicyCount - prev.zoneFwPolicyCount : undefined,
    deltaDirection: getDeltaDirection(metrics.zoneFwPolicyCount, prev?.zoneFwPolicyCount),
    calculatedPoints: Math.round(fwScore * 100) / 100,
    scoringRule: 'Full score if zone FW count > 0 in both snapshots and delta ≥ 0',
    requiresComparativeSnapshot: true
  })

  // 11. eBGP Neighbours (delta <= 0, 5 pts)
  const bgpScore = deltaLteZeroScore(metrics.ebgpNeighborsCount, prev?.ebgpNeighborsCount, metrics.ebgpNeighborsAvailable, 5)
  details.push({
    id: '21.2.B-ebgp',
    name: 'eBGP Neighbours',
    ipFabricContext: 'Enumerate eBGP neighbours for external connectivity',
    maxPoints: 5,
    currentValue: metrics.ebgpNeighborsCount ?? 'N/A',
    previousValue: prev?.ebgpNeighborsCount ?? undefined,
    delta: prev?.ebgpNeighborsCount != null && metrics.ebgpNeighborsCount != null ? metrics.ebgpNeighborsCount - prev.ebgpNeighborsCount : undefined,
    deltaDirection: getDeltaDirection(metrics.ebgpNeighborsCount, prev?.ebgpNeighborsCount, true),
    calculatedPoints: Math.round(bgpScore * 100) / 100,
    scoringRule: 'Full score if eBGP count is stable or decreasing (delta ≤ 0)',
    requiresComparativeSnapshot: true
  })

  // 12. Automatic Diagramming (boolean, 5 pts)
  const diagScore = metrics.diagramAvailable ? 5 : 0
  details.push({
    id: '21.2.B-diagrams',
    name: 'Automatic Diagramming',
    ipFabricContext: 'Full topology, site, L3, or L2 diagrams available',
    maxPoints: 5,
    currentValue: metrics.diagramAvailable ? 1 : 0,
    calculatedPoints: diagScore,
    scoringRule: 'Full score if topology diagrams can be generated'
  })

  const score = Math.round(details.reduce((sum, d) => sum + d.calculatedPoints, 0) * 100) / 100
  return { score: Math.min(score, maxScore), maxScore, status: getStatus(score, maxScore), details }
}

/**
 * Article 21.2.C - Business Continuity
 * 5 checks × 5 points = 25 points max
 */
function calculateArticle21CScore(metrics: NIS2Metrics): Omit<NIS2Article, 'id' | 'name'> {
  const maxScore = 25
  const prev = metrics.previousMetrics
  const details: NIS2CheckDetail[] = []

  // 1. Discovery Issues (tiered, 5 pts)
  const discScore = discoveryIssuesTieredScore(metrics.discoveryIssues, 5)
  details.push({
    id: '21.2.C-discovery',
    name: 'Discovery Issues',
    ipFabricContext: 'Comprehensive discovery for configuration management and redeployments',
    maxPoints: 5,
    currentValue: metrics.discoveryIssues,
    previousValue: prev?.discoveryIssues,
    delta: prev?.discoveryIssues != null ? metrics.discoveryIssues - prev.discoveryIssues : undefined,
    deltaDirection: getDeltaDirection(metrics.discoveryIssues, prev?.discoveryIssues, true),
    calculatedPoints: discScore,
    scoringRule: '0 errors = 5pts, 1-10 = 4pts, 11-20 = 3pts, 21-30 = 2pts, 31-40 = 1pt, 41+ = 0pts'
  })

  // 2. Devices (boolean, 5 pts)
  const devScore = booleanPresenceScore(metrics.deviceCount, metrics.deviceCountAvailable, 5)
  details.push({
    id: '21.2.C-devices',
    name: 'Device Inventory',
    ipFabricContext: 'Automatic discovery and inventory for backup management and disaster recovery',
    maxPoints: 5,
    currentValue: metrics.deviceCount || 0,
    previousValue: prev?.totalDevices,
    calculatedPoints: devScore,
    scoringRule: 'Full score if device inventory returns data'
  })

  // 3. Sites (boolean, 5 pts)
  const siteScore = booleanPresenceScore(metrics.siteCount, metrics.siteCountAvailable, 5)
  details.push({
    id: '21.2.C-sites',
    name: 'Site Inventory',
    ipFabricContext: 'Sites for disaster recovery planning',
    maxPoints: 5,
    currentValue: metrics.siteCount ?? 'N/A',
    calculatedPoints: siteScore,
    scoringRule: 'Full score if site inventory returns data'
  })

  // 4. Unique platforms (boolean, 5 pts)
  const platScore = booleanPresenceScore(metrics.uniquePlatforms, metrics.uniquePlatformsAvailable, 5)
  details.push({
    id: '21.2.C-platforms',
    name: 'Platform Types',
    ipFabricContext: 'Software platforms and OS versions running on network devices',
    maxPoints: 5,
    currentValue: metrics.uniquePlatforms ?? 'N/A',
    calculatedPoints: platScore,
    scoringRule: 'Full score if platform inventory returns data'
  })

  // 5. Config Management (delta >= 0, 5 pts)
  const configScore = deltaGteZeroScore(metrics.configurationCount, prev?.configurationCount, metrics.configurationCountAvailable, 5)
  details.push({
    id: '21.2.C-config',
    name: 'Configuration Management',
    ipFabricContext: 'Configuration files tracked for backup and recovery',
    maxPoints: 5,
    currentValue: metrics.configurationCount ?? 'N/A',
    previousValue: prev?.configurationCount ?? undefined,
    calculatedPoints: configScore,
    scoringRule: 'Full score if config count > 0 and delta ≥ 0',
    requiresComparativeSnapshot: true
  })

  const score = Math.round(details.reduce((sum, d) => sum + d.calculatedPoints, 0) * 100) / 100
  return { score: Math.min(score, maxScore), maxScore, status: getStatus(score, maxScore), details }
}

/**
 * Article 21.2.D - Supply Chain Security
 * 4 checks × 5 points = 20 points max
 */
function calculateArticle21DScore(metrics: NIS2Metrics): Omit<NIS2Article, 'id' | 'name'> {
  const maxScore = 20
  const prev = metrics.previousMetrics
  const details: NIS2CheckDetail[] = []

  const aclScore = deltaGteZeroScore(metrics.aclPolicyCount, prev?.aclPolicyCount, metrics.aclPolicyCountAvailable, 5)
  details.push({ id: '21.2.D-acl', name: 'ACL Policies', ipFabricContext: 'Access control list rulesets for supply chain boundaries', maxPoints: 5, currentValue: metrics.aclPolicyCount ?? 'N/A', previousValue: prev?.aclPolicyCount ?? undefined, calculatedPoints: aclScore, scoringRule: 'Full score if ACL count > 0 and delta ≥ 0', requiresComparativeSnapshot: true })

  const fwScore = deltaGteZeroScore(metrics.zoneFwPolicyCount, prev?.zoneFwPolicyCount, metrics.zoneFwPolicyCountAvailable, 5)
  details.push({ id: '21.2.D-zonefw', name: 'Zone Firewall Policies', ipFabricContext: 'Zone firewall rulesets for supply chain segmentation', maxPoints: 5, currentValue: metrics.zoneFwPolicyCount ?? 'N/A', previousValue: prev?.zoneFwPolicyCount ?? undefined, calculatedPoints: fwScore, scoringRule: 'Full score if zone FW count > 0 and delta ≥ 0', requiresComparativeSnapshot: true })

  const bgpScore = deltaLteZeroScore(metrics.ebgpNeighborsCount, prev?.ebgpNeighborsCount, metrics.ebgpNeighborsAvailable, 5)
  details.push({ id: '21.2.D-ebgp', name: 'eBGP Neighbours', ipFabricContext: 'External BGP neighbours for supply chain connectivity', maxPoints: 5, currentValue: metrics.ebgpNeighborsCount ?? 'N/A', previousValue: prev?.ebgpNeighborsCount ?? undefined, calculatedPoints: bgpScore, scoringRule: 'Full score if eBGP count stable or decreasing', requiresComparativeSnapshot: true })

  const diagScore = metrics.diagramAvailable ? 5 : 0
  details.push({ id: '21.2.D-diagrams', name: 'Automatic Diagramming', ipFabricContext: 'Topology diagrams for supply chain visibility', maxPoints: 5, currentValue: metrics.diagramAvailable ? 1 : 0, calculatedPoints: diagScore, scoringRule: 'Full score if diagrams available' })

  const score = Math.round(details.reduce((sum, d) => sum + d.calculatedPoints, 0) * 100) / 100
  return { score: Math.min(score, maxScore), maxScore, status: getStatus(score, maxScore), details }
}

/**
 * Article 21.2.E - Vulnerability Handling
 * 1 check × 5 points = 5 points max
 */
function calculateArticle21EScore(metrics: NIS2Metrics): Omit<NIS2Article, 'id' | 'name'> {
  const maxScore = 5
  const prev = metrics.previousMetrics
  const details: NIS2CheckDetail[] = []

  const eosScore = inversePercentScore(metrics.endOfSupportPercent, metrics.endOfSupportAvailable, 5)
  details.push({
    id: '21.2.E-eos',
    name: 'Lifecycle Management (End of Support)',
    ipFabricContext: 'Devices running End of Support software',
    maxPoints: 5,
    currentValue: metrics.endOfSupportPercent != null ? `${metrics.endOfSupportPercent}%` : 'N/A',
    previousValue: prev?.endOfSupportPercent != null ? `${prev.endOfSupportPercent}%` : undefined,
    delta: prev?.endOfSupportPercent != null && metrics.endOfSupportPercent != null ? `${(metrics.endOfSupportPercent - prev.endOfSupportPercent).toFixed(1)}%` : undefined,
    deltaDirection: getDeltaDirection(metrics.endOfSupportPercent, prev?.endOfSupportPercent, true),
    calculatedPoints: Math.round(eosScore * 100) / 100,
    scoringRule: '(100 - EoS%) / 100 × 5 points. Target: 0% EoS devices'
  })

  const score = Math.round(details.reduce((sum, d) => sum + d.calculatedPoints, 0) * 100) / 100
  return { score: Math.min(score, maxScore), maxScore, status: getStatus(score, maxScore), details }
}

/**
 * Article 21.2.F - Risk Management Assessment
 * 6 checks × 5 points = 30 points max
 */
function calculateArticle21FScore(metrics: NIS2Metrics): Omit<NIS2Article, 'id' | 'name'> {
  const maxScore = 30
  const prev = metrics.previousMetrics
  const details: NIS2CheckDetail[] = []

  // AAA (percent, 5 pts)
  const aaaScore = percentScore(metrics.aaaPercent, metrics.aaaAvailable, 5)
  details.push({ id: '21.2.F-aaa', name: 'TACACS/RADIUS Configured', ipFabricContext: 'Credential management configurations across network devices', maxPoints: 5, currentValue: metrics.aaaPercent != null ? `${metrics.aaaPercent}%` : 'N/A', previousValue: prev?.aaaPercent != null ? `${prev.aaaPercent}%` : undefined, delta: prev?.aaaPercent != null && metrics.aaaPercent != null ? `${(metrics.aaaPercent - prev.aaaPercent).toFixed(1)}%` : undefined, deltaDirection: getDeltaDirection(metrics.aaaPercent, prev?.aaaPercent), calculatedPoints: Math.round(aaaScore * 100) / 100, scoringRule: 'AAA percentage × max 5 points' })

  // Telnet (inverse percent, 5 pts)
  const telnetScore = inversePercentScore(metrics.telnetPercent, metrics.telnetAvailable, 5)
  details.push({ id: '21.2.F-telnet', name: 'Telnet Protocol Disabled', ipFabricContext: 'Devices where telnet protocol is still enabled', maxPoints: 5, currentValue: metrics.telnetPercent != null ? `${metrics.telnetPercent}%` : 'N/A', previousValue: prev?.telnetPercent != null ? `${prev.telnetPercent}%` : undefined, delta: prev?.telnetPercent != null && metrics.telnetPercent != null ? `${(metrics.telnetPercent - prev.telnetPercent).toFixed(1)}%` : undefined, deltaDirection: getDeltaDirection(metrics.telnetPercent, prev?.telnetPercent, true), calculatedPoints: Math.round(telnetScore * 100) / 100, scoringRule: '(100 - telnet%) / 100 × 5 points. Target: 0% telnet' })

  // Local Logging (percent, 5 pts)
  const localLogScore = percentScore(metrics.localLoggingPercent, metrics.localLoggingAvailable, 5)
  details.push({ id: '21.2.F-local-log', name: 'Local Logging', ipFabricContext: 'Devices with local logging for effectiveness assessment', maxPoints: 5, currentValue: metrics.localLoggingPercent != null ? `${metrics.localLoggingPercent}%` : 'N/A', calculatedPoints: Math.round(localLogScore * 100) / 100, scoringRule: 'Local logging percentage × max 5 points. Target: 100%' })

  // Remote Logging (percent, 5 pts)
  const remoteLogScore = percentScore(metrics.remoteLoggingPercent, metrics.remoteLoggingAvailable, 5)
  details.push({ id: '21.2.F-remote-log', name: 'Remote Logging', ipFabricContext: 'Devices with remote syslog for centralised monitoring', maxPoints: 5, currentValue: metrics.remoteLoggingPercent != null ? `${metrics.remoteLoggingPercent}%` : 'N/A', calculatedPoints: Math.round(remoteLogScore * 100) / 100, scoringRule: 'Remote logging percentage × max 5 points. Target: 100%' })

  // ACL ANY/ANY (delta <= 0, 5 pts)
  const anyAclScore = deltaLteZeroScore(metrics.anyAnyAclCount, prev?.anyAnyAclCount, metrics.anyAnyAclAvailable, 5)
  details.push({ id: '21.2.F-any-acl', name: 'ACL ANY/ANY Policies', ipFabricContext: 'Overly promiscuous ACL rulesets', maxPoints: 5, currentValue: metrics.anyAnyAclCount ?? 'N/A', previousValue: prev?.anyAnyAclCount ?? undefined, delta: prev?.anyAnyAclCount != null && metrics.anyAnyAclCount != null ? metrics.anyAnyAclCount - prev.anyAnyAclCount : undefined, deltaDirection: getDeltaDirection(metrics.anyAnyAclCount, prev?.anyAnyAclCount, true), calculatedPoints: anyAclScore, scoringRule: 'Full score if ANY/ANY ACL count is stable or decreasing (delta ≤ 0)', requiresComparativeSnapshot: true })

  // FW ANY/ANY (delta <= 0, 5 pts)
  const anyFwScore = deltaLteZeroScore(metrics.anyAnyFwCount, prev?.anyAnyFwCount, metrics.anyAnyFwAvailable, 5)
  details.push({ id: '21.2.F-any-fw', name: 'FW ANY/ANY Policies', ipFabricContext: 'Overly promiscuous zone firewall rulesets', maxPoints: 5, currentValue: metrics.anyAnyFwCount ?? 'N/A', previousValue: prev?.anyAnyFwCount ?? undefined, delta: prev?.anyAnyFwCount != null && metrics.anyAnyFwCount != null ? metrics.anyAnyFwCount - prev.anyAnyFwCount : undefined, deltaDirection: getDeltaDirection(metrics.anyAnyFwCount, prev?.anyAnyFwCount, true), calculatedPoints: anyFwScore, scoringRule: 'Full score if ANY/ANY FW count is stable or decreasing (delta ≤ 0)', requiresComparativeSnapshot: true })

  const score = Math.round(details.reduce((sum, d) => sum + d.calculatedPoints, 0) * 100) / 100
  return { score: Math.min(score, maxScore), maxScore, status: getStatus(score, maxScore), details }
}

/**
 * Article 21.2.H - Cryptography & Encryption
 * 2 checks × 5 points = 10 points max
 */
function calculateArticle21HScore(metrics: NIS2Metrics): Omit<NIS2Article, 'id' | 'name'> {
  const maxScore = 10
  const prev = metrics.previousMetrics
  const details: NIS2CheckDetail[] = []

  const telnetScore = inversePercentScore(metrics.telnetPercent, metrics.telnetAvailable, 5)
  details.push({ id: '21.2.H-telnet', name: 'Clear-text Telnet Disabled', ipFabricContext: 'Devices where telnet protocol is enabled', maxPoints: 5, currentValue: metrics.telnetPercent != null ? `${metrics.telnetPercent}%` : 'N/A', previousValue: prev?.telnetPercent != null ? `${prev.telnetPercent}%` : undefined, calculatedPoints: Math.round(telnetScore * 100) / 100, scoringRule: '(100 - telnet%) / 100 × 5 points. Target: 0%' })

  const dot1xScore = percentScore(metrics.securePortsPercent, metrics.securePortsAvailable, 5)
  details.push({ id: '21.2.H-8021x', name: '802.1X Secure Ports', ipFabricContext: 'Devices and ports running 802.1X', maxPoints: 5, currentValue: metrics.securePortsPercent != null ? `${metrics.securePortsPercent}%` : 'N/A', previousValue: prev?.securePortsPercent != null ? `${prev.securePortsPercent}%` : undefined, delta: prev?.securePortsPercent != null && metrics.securePortsPercent != null ? `${(metrics.securePortsPercent - prev.securePortsPercent).toFixed(1)}%` : undefined, deltaDirection: getDeltaDirection(metrics.securePortsPercent, prev?.securePortsPercent), calculatedPoints: Math.round(dot1xScore * 100) / 100, scoringRule: '802.1X percentage × max 5 points. Target: 100%' })

  const score = Math.round(details.reduce((sum, d) => sum + d.calculatedPoints, 0) * 100) / 100
  return { score: Math.min(score, maxScore), maxScore, status: getStatus(score, maxScore), details }
}

/**
 * Article 21.2.I - Access Control & Asset Management
 * 7 checks × 5 points = 35 points max
 */
function calculateArticle21IScore(metrics: NIS2Metrics): Omit<NIS2Article, 'id' | 'name'> {
  const maxScore = 35
  const prev = metrics.previousMetrics
  const details: NIS2CheckDetail[] = []

  const aclScore = deltaGteZeroScore(metrics.aclPolicyCount, prev?.aclPolicyCount, metrics.aclPolicyCountAvailable, 5)
  details.push({ id: '21.2.I-acl', name: 'ACL Policies', ipFabricContext: 'Access control list rulesets for resource access', maxPoints: 5, currentValue: metrics.aclPolicyCount ?? 'N/A', calculatedPoints: aclScore, scoringRule: 'Full score if ACL count > 0 and delta ≥ 0', requiresComparativeSnapshot: true })

  const fwScore = deltaGteZeroScore(metrics.zoneFwPolicyCount, prev?.zoneFwPolicyCount, metrics.zoneFwPolicyCountAvailable, 5)
  details.push({ id: '21.2.I-zonefw', name: 'Zone Firewall Policies', ipFabricContext: 'Zone firewall rulesets for access segmentation', maxPoints: 5, currentValue: metrics.zoneFwPolicyCount ?? 'N/A', calculatedPoints: fwScore, scoringRule: 'Full score if zone FW count > 0 and delta ≥ 0', requiresComparativeSnapshot: true })

  const aaaScore = percentScore(metrics.aaaPercent, metrics.aaaAvailable, 5)
  details.push({ id: '21.2.I-aaa', name: 'TACACS/RADIUS Configured', ipFabricContext: 'Authentication mechanisms for asset access control', maxPoints: 5, currentValue: metrics.aaaPercent != null ? `${metrics.aaaPercent}%` : 'N/A', calculatedPoints: Math.round(aaaScore * 100) / 100, scoringRule: 'AAA percentage × max 5 points' })

  const devScore = booleanPresenceScore(metrics.deviceCount, metrics.deviceCountAvailable, 5)
  details.push({ id: '21.2.I-devices', name: 'Device Inventory', ipFabricContext: 'Comprehensive asset inventory for access management', maxPoints: 5, currentValue: metrics.deviceCount || 0, calculatedPoints: devScore, scoringRule: 'Full score if device inventory returns data' })

  const configScore = deltaGteZeroScore(metrics.configurationCount, prev?.configurationCount, metrics.configurationCountAvailable, 5)
  details.push({ id: '21.2.I-config', name: 'Configuration Management', ipFabricContext: 'Configuration tracking for asset management', maxPoints: 5, currentValue: metrics.configurationCount ?? 'N/A', calculatedPoints: configScore, scoringRule: 'Full score if config count > 0 and delta ≥ 0', requiresComparativeSnapshot: true })

  const eosScore = inversePercentScore(metrics.endOfSupportPercent, metrics.endOfSupportAvailable, 5)
  details.push({ id: '21.2.I-eos', name: 'Lifecycle Management', ipFabricContext: 'End of Support devices requiring asset management action', maxPoints: 5, currentValue: metrics.endOfSupportPercent != null ? `${metrics.endOfSupportPercent}%` : 'N/A', calculatedPoints: Math.round(eosScore * 100) / 100, scoringRule: '(100 - EoS%) / 100 × 5 points. Target: 0%' })

  const discScore = discoveryIssuesTieredScore(metrics.discoveryIssues, 5)
  details.push({ id: '21.2.I-discovery', name: 'Discovery Issues', ipFabricContext: 'Discovery completeness for effective asset management', maxPoints: 5, currentValue: metrics.discoveryIssues, calculatedPoints: discScore, scoringRule: 'Tiered: 0 errors = 5pts down to 41+ = 0pts' })

  const score = Math.round(details.reduce((sum, d) => sum + d.calculatedPoints, 0) * 100) / 100
  return { score: Math.min(score, maxScore), maxScore, status: getStatus(score, maxScore), details }
}

/**
 * Article 27.2.F - Entity IP Ranges
 * 3 checks × 5 points = 15 points max
 */
function calculateArticle27FScore(metrics: NIS2Metrics): Omit<NIS2Article, 'id' | 'name'> {
  const maxScore = 15
  const prev = metrics.previousMetrics
  const details: NIS2CheckDetail[] = []

  // Discovery Issues (tiered, 5 pts)
  const discScore = discoveryIssuesTieredScore(metrics.discoveryIssues, 5)
  details.push({
    id: '27.2.F-discovery',
    name: 'Discovery Issues',
    ipFabricContext: 'Independent visibility of managed hosts with public IP ranges',
    maxPoints: 5,
    currentValue: metrics.discoveryIssues,
    previousValue: prev?.discoveryIssues,
    delta: prev?.discoveryIssues != null ? metrics.discoveryIssues - prev.discoveryIssues : undefined,
    deltaDirection: getDeltaDirection(metrics.discoveryIssues, prev?.discoveryIssues, true),
    calculatedPoints: discScore,
    scoringRule: 'Tiered: 0 errors = 5pts down to 41+ = 0pts'
  })

  // IPv4 Routes (boolean, 5 pts)
  const ipv4Score = booleanPresenceScore(metrics.ipv4RoutesCount, metrics.ipv4RoutesAvailable, 5)
  details.push({
    id: '27.2.F-ipv4routes',
    name: 'IPv4 Routing Tables',
    ipFabricContext: 'Cumulative routing table from all managed network devices',
    maxPoints: 5,
    currentValue: metrics.ipv4RoutesCount ?? 'N/A',
    previousValue: prev?.ipv4RoutesCount ?? undefined,
    delta: prev?.ipv4RoutesCount != null && metrics.ipv4RoutesCount != null ? metrics.ipv4RoutesCount - prev.ipv4RoutesCount : undefined,
    deltaDirection: getDeltaDirection(metrics.ipv4RoutesCount, prev?.ipv4RoutesCount),
    calculatedPoints: ipv4Score,
    scoringRule: 'Full score if IPv4 route inventory returns data (> 0 prefixes)'
  })

  // IPv6 Routes (boolean, 5 pts)
  const ipv6Score = booleanPresenceScore(metrics.ipv6RoutesCount, metrics.ipv6RoutesAvailable, 5)
  details.push({
    id: '27.2.F-ipv6routes',
    name: 'IPv6 Routing Tables',
    ipFabricContext: 'Cumulative IPv6 routing table from all managed network devices',
    maxPoints: 5,
    currentValue: metrics.ipv6RoutesCount ?? 'N/A',
    previousValue: prev?.ipv6RoutesCount ?? undefined,
    delta: prev?.ipv6RoutesCount != null && metrics.ipv6RoutesCount != null ? metrics.ipv6RoutesCount - prev.ipv6RoutesCount : undefined,
    deltaDirection: getDeltaDirection(metrics.ipv6RoutesCount, prev?.ipv6RoutesCount),
    calculatedPoints: ipv6Score,
    scoringRule: 'Full score if IPv6 route inventory returns data (> 0 prefixes)'
  })

  const score = Math.round(details.reduce((sum, d) => sum + d.calculatedPoints, 0) * 100) / 100
  return { score: Math.min(score, maxScore), maxScore, status: getStatus(score, maxScore), details }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Extract metrics from already-calculated articles
 */
export function extractMetricsFromArticles(
  articles: NIS2Article[],
  totalDevices: number,
  totalSites: number
): NIS2Metrics {
  return {
    totalDevices,
    totalSites,
    deviceCount: totalDevices,
    deviceCountAvailable: true,
    siteCount: totalSites,
    siteCountAvailable: true,
    ntpPercent: null, ntpAvailable: false,
    ipv4DnsCoveragePercent: null, ipv4DnsCoverageAvailable: false,
    dnsServersCount: null, dnsServersAvailable: false,
    localLoggingPercent: null, localLoggingAvailable: false,
    remoteLoggingPercent: null, remoteLoggingAvailable: false,
    configurationCount: null, configurationCountAvailable: false,
    aclPolicyCount: null, aclPolicyCountAvailable: false,
    zoneFwPolicyCount: null, zoneFwPolicyCountAvailable: false,
    ebgpNeighborsCount: null, ebgpNeighborsAvailable: false,
    diagramAvailable: false,
    discoveryIssues: 0, discoveryIssuesAvailable: false,
    uniquePlatforms: null, uniquePlatformsAvailable: false,
    endOfSupportPercent: null, endOfSupportAvailable: false,
    aaaPercent: null, aaaAvailable: false,
    telnetPercent: null, telnetAvailable: false,
    anyAnyAclCount: null, anyAnyAclAvailable: false,
    anyAnyFwCount: null, anyAnyFwAvailable: false,
    securePortsPercent: null, securePortsAvailable: false,
    ipv4RoutesCount: null, ipv4RoutesAvailable: false,
    ipv6RoutesCount: null, ipv6RoutesAvailable: false
  }
}

/**
 * Recalculate articles with updated metrics
 */
export function recalculateArticlesWithMetrics(metrics: NIS2Metrics): NIS2Article[] {
  return [
    { id: '21.2.B', name: 'Incident Handling', ...calculateArticle21BScore(metrics) },
    { id: '21.2.C', name: 'Business Continuity', ...calculateArticle21CScore(metrics) },
    { id: '21.2.D', name: 'Supply Chain Security', ...calculateArticle21DScore(metrics) },
    { id: '21.2.E', name: 'Vulnerability Handling', ...calculateArticle21EScore(metrics) },
    { id: '21.2.F', name: 'Risk Management Assessment', ...calculateArticle21FScore(metrics) },
    { id: '21.2.H', name: 'Cryptography & Encryption', ...calculateArticle21HScore(metrics) },
    { id: '21.2.I', name: 'Access Control & Asset Management', ...calculateArticle21IScore(metrics) },
    { id: '27.2.F', name: 'Entity IP Ranges', ...calculateArticle27FScore(metrics) }
  ]
}
