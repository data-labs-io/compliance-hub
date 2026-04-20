/**
 * NIST CSF v2.0 Calculator
 * Implements scoring logic for the 6 core NIST CSF functions
 * Based on NIST-IMPLEMENTATION-FRAMEWORK.pdf from IP Fabric
 *
 * Functions:
 * - GV: Govern (max 5 points)
 * - ID: Identify (max 5 points)
 * - PR: Protect (max 5 points)
 * - DE: Detect (max 5 points)
 * - RS: Respond (max 5 points)
 * - RC: Recover (max 5 points)
 *
 * Total: 30 points max
 */

import { Device } from '@/lib/device-generator'
import type { NISTCSFMetrics, NISTCSFFunction, NISTCSFSubcategoryDetail } from './types'
import {
  fetchDiscoveryErrors,
  fetchSiteCount,
  fetchPlatformTypes,
  fetchVersionVariance,
  fetchIntentChecksMetrics,
  fetchAaaPercentage,
  fetchLocalAaaUsersPercentage,
  fetchEndOfSupportSummary,
  fetchLocalLoggingPercentage,
  fetchRemoteLoggingPercentage,
  fetchErrDisabledPercentage,
  fetchUnstableRoutesCount,
  fetchRoutesCount,
  fetchAnyAnyAclCount,
  fetchDnsCoverage,
  fetchPathLookupAvailability,
  fetchBgpNeighborsCount,
  fetchIPv6RoutesCount,
  fetchConfigConsistencyCount
} from '@/services/metrics-api'

// ============================================
// Main Entry Points
// ============================================

/**
 * Calculate all NIST CSF functions with progressive loading
 * Emits batch callbacks as each batch completes
 */
export async function calculateNISTCSFProgressive(
  devices: Device[],
  snapshotId: string,
  intentChecksPassed: number,
  intentChecksFailed: number,
  apiCall?: (endpoint: string, options?: any) => Promise<any>,
  previousSnapshotId?: string | null,
  previousDevices?: Device[],
  onBatchComplete?: (batchNumber: number, functions: NISTCSFFunction[], totalBatches: number) => void
): Promise<NISTCSFFunction[]> {
  if (!apiCall) {
    // Fallback to basic calculation if no API
    return calculateNISTCSFFunctions(devices, snapshotId, intentChecksPassed, intentChecksFailed, apiCall, previousSnapshotId, previousDevices)
  }

  const allFunctions: NISTCSFFunction[] = []
  const totalBatches = 4
  const totalDevices = devices.length

  // Initialize accumulated metrics
  let accumulatedMetrics: Partial<NISTCSFMetrics> = {
    totalDevices,
    totalSites: 0,
    intentChecksPassed,
    intentChecksFailed,
    intentChecksTotal: intentChecksPassed + intentChecksFailed,
    discoveryIssues: 0,
    discoveryIssuesAvailable: false,
    deviceCount: totalDevices,
    deviceCountAvailable: true,
    siteCount: 0,
    siteCountAvailable: false,
    uniquePlatforms: 0,
    uniquePlatformsAvailable: false,
    versionVariance: 1,
    versionVarianceAvailable: false,
    ipv4DnsCoveragePercent: 0,
    ipv4DnsCoverageAvailable: false,
    ipv6ConfiguredPercent: 100, // Default to 100 if no IPv6
    ipv6ConfiguredAvailable: true,
    pathLookupAvailable: false,
    aaaServersPercent: 0,
    aaaServersAvailable: false,
    localUsersPercent: 0,
    localUsersAvailable: false,
    endOfSupportPercent: 0,
    endOfSupportAvailable: false,
    localLoggingPercent: 0,
    localLoggingAvailable: false,
    errDisabledPercent: 0,
    errDisabledAvailable: false,
    unstableRoutesCount: 0,
    unstableRoutesAvailable: false,
    ebgpNeighborsCount: 0,
    ebgpNeighborsAvailable: false,
    remoteLoggingPercent: 0,
    remoteLoggingAvailable: false,
    anyAnyAclCount: 0,
    anyAnyAclAvailable: false,
    ipv4RoutesCount: 0,
    ipv4RoutesAvailable: false,
    ipv6RoutesCount: 0,
    ipv6RoutesAvailable: false,
    configChangedCount: 0,
    configChangedAvailable: false
  }

  // Fetch previous metrics if comparison is enabled
  if (previousSnapshotId) {
    const prevMetrics = await fetchPreviousNISTMetrics(previousSnapshotId, previousDevices || devices, apiCall)
    accumulatedMetrics.previousMetrics = prevMetrics
  }

  // ============================================
  // BATCH 1: Foundation (GV + ID functions)
  // ============================================
  try {
    const batch1Metrics = await fetchBatch1Metrics(snapshotId, devices, intentChecksPassed, intentChecksFailed, apiCall)
    accumulatedMetrics = { ...accumulatedMetrics, ...batch1Metrics }

    const govFunc = calculateGovernScore(accumulatedMetrics as NISTCSFMetrics)
    const idFunc = calculateIdentifyScore(accumulatedMetrics as NISTCSFMetrics)

    allFunctions.push(
      { id: 'GV', name: 'Govern', ...govFunc },
      { id: 'ID', name: 'Identify', ...idFunc }
    )

    if (onBatchComplete) {
      onBatchComplete(1, [...allFunctions], totalBatches)
    }
  } catch (error) {
    console.error('[NIST CSF] Batch 1 error:', error)
  }

  // ============================================
  // BATCH 2: Protection (PR function)
  // ============================================
  try {
    const batch2Metrics = await fetchBatch2Metrics(snapshotId, totalDevices, apiCall)
    accumulatedMetrics = { ...accumulatedMetrics, ...batch2Metrics }

    const prFunc = calculateProtectScore(accumulatedMetrics as NISTCSFMetrics)

    // Update existing or add new
    const prIndex = allFunctions.findIndex(f => f.id === 'PR')
    if (prIndex >= 0) {
      allFunctions[prIndex] = { id: 'PR', name: 'Protect', ...prFunc }
    } else {
      allFunctions.push({ id: 'PR', name: 'Protect', ...prFunc })
    }

    if (onBatchComplete) {
      onBatchComplete(2, [...allFunctions], totalBatches)
    }
  } catch (error) {
    console.error('[NIST CSF] Batch 2 error:', error)
  }

  // ============================================
  // BATCH 3: Detection (DE function)
  // ============================================
  try {
    const batch3Metrics = await fetchBatch3Metrics(snapshotId, totalDevices, apiCall)
    accumulatedMetrics = { ...accumulatedMetrics, ...batch3Metrics }

    const deFunc = calculateDetectScore(accumulatedMetrics as NISTCSFMetrics)

    const deIndex = allFunctions.findIndex(f => f.id === 'DE')
    if (deIndex >= 0) {
      allFunctions[deIndex] = { id: 'DE', name: 'Detect', ...deFunc }
    } else {
      allFunctions.push({ id: 'DE', name: 'Detect', ...deFunc })
    }

    if (onBatchComplete) {
      onBatchComplete(3, [...allFunctions], totalBatches)
    }
  } catch (error) {
    console.error('[NIST CSF] Batch 3 error:', error)
  }

  // ============================================
  // BATCH 4: Response & Recovery (RS + RC functions)
  // ============================================
  try {
    const batch4Metrics = await fetchBatch4Metrics(snapshotId, apiCall)
    accumulatedMetrics = { ...accumulatedMetrics, ...batch4Metrics }

    const rsFunc = calculateRespondScore(accumulatedMetrics as NISTCSFMetrics)
    const rcFunc = calculateRecoverScore(accumulatedMetrics as NISTCSFMetrics)

    // Update or add
    const rsIndex = allFunctions.findIndex(f => f.id === 'RS')
    if (rsIndex >= 0) {
      allFunctions[rsIndex] = { id: 'RS', name: 'Respond', ...rsFunc }
    } else {
      allFunctions.push({ id: 'RS', name: 'Respond', ...rsFunc })
    }

    const rcIndex = allFunctions.findIndex(f => f.id === 'RC')
    if (rcIndex >= 0) {
      allFunctions[rcIndex] = { id: 'RC', name: 'Recover', ...rcFunc }
    } else {
      allFunctions.push({ id: 'RC', name: 'Recover', ...rcFunc })
    }

    if (onBatchComplete) {
      onBatchComplete(4, [...allFunctions], totalBatches)
    }
  } catch (error) {
    console.error('[NIST CSF] Batch 4 error:', error)
  }

  // Ensure correct order: GV, ID, PR, DE, RS, RC
  const orderedFunctions = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC']
  return orderedFunctions
    .map(id => allFunctions.find(f => f.id === id))
    .filter((f): f is NISTCSFFunction => f !== undefined)
}

/**
 * Calculate all NIST CSF functions without progressive loading
 */
export async function calculateNISTCSFFunctions(
  devices: Device[],
  snapshotId: string,
  intentChecksPassed: number,
  intentChecksFailed: number,
  apiCall?: (endpoint: string, options?: any) => Promise<any>,
  previousSnapshotId?: string | null,
  previousDevices?: Device[]
): Promise<NISTCSFFunction[]> {
  const metrics = await calculateNISTMetrics(devices, snapshotId, intentChecksPassed, intentChecksFailed, apiCall)

  // Fetch previous snapshot metrics for delta calculation
  if (previousSnapshotId && apiCall) {
    try {
      metrics.previousMetrics = await fetchPreviousNISTMetrics(previousSnapshotId, previousDevices || devices, apiCall)
    } catch (error) {
      console.error('[calculateNISTCSFFunctions] Error fetching previous metrics:', error)
    }
  }

  return [
    { id: 'GV', name: 'Govern', ...calculateGovernScore(metrics) },
    { id: 'ID', name: 'Identify', ...calculateIdentifyScore(metrics) },
    { id: 'PR', name: 'Protect', ...calculateProtectScore(metrics) },
    { id: 'DE', name: 'Detect', ...calculateDetectScore(metrics) },
    { id: 'RS', name: 'Respond', ...calculateRespondScore(metrics) },
    { id: 'RC', name: 'Recover', ...calculateRecoverScore(metrics) }
  ]
}

/**
 * Calculate overall NIST CSF score as percentage
 */
export function calculateOverallNISTCSFScore(functions: NISTCSFFunction[]): number {
  const totalScore = functions.reduce((sum, f) => sum + f.score, 0)
  const maxScore = functions.reduce((sum, f) => sum + f.maxScore, 0)
  const percentage = Math.round((totalScore / maxScore) * 1000) / 10 // Round to 1 decimal

  return percentage
}

// ============================================
// Batch Metric Fetchers
// ============================================

async function fetchBatch1Metrics(
  snapshotId: string,
  devices: Device[],
  intentChecksPassed: number,
  intentChecksFailed: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<NISTCSFMetrics>> {
  const totalDevices = devices.length
  const metrics: Partial<NISTCSFMetrics> = {
    totalDevices,
    deviceCount: totalDevices,
    deviceCountAvailable: true,
    intentChecksPassed,
    intentChecksFailed,
    intentChecksTotal: intentChecksPassed + intentChecksFailed
  }

  // GV.RM-1: Intent Checks (already have passed/failed)
  if (intentChecksPassed === 0 && intentChecksFailed === 0) {
    const intentMetrics = await fetchIntentChecksMetrics(snapshotId, apiCall)
    if (intentMetrics) {
      metrics.intentChecksPassed = intentMetrics.passed
      metrics.intentChecksFailed = intentMetrics.failed
      metrics.intentChecksTotal = intentMetrics.passed + intentMetrics.failed
    }
  }

  // GV.OV-03: Discovery Issues
  const discoveryResult = await fetchDiscoveryErrors(snapshotId, apiCall)
  metrics.discoveryIssues = discoveryResult.data?.count || 0
  metrics.discoveryIssuesAvailable = discoveryResult.availability?.available ?? true
  metrics.discoveryIssuesReason = discoveryResult.availability?.impact

  // ID.AM-1: Sites
  const siteCountResult = await fetchSiteCount(snapshotId, apiCall)
  metrics.siteCount = siteCountResult.value
  metrics.siteCountAvailable = siteCountResult.available
  metrics.siteCountReason = siteCountResult.reason
  metrics.totalSites = siteCountResult.value ?? 0

  // ID.AM-2: Platforms
  const platformTypesResult = await fetchPlatformTypes(snapshotId, apiCall)
  metrics.uniquePlatforms = platformTypesResult.value
  metrics.uniquePlatformsAvailable = platformTypesResult.available
  metrics.uniquePlatformsReason = platformTypesResult.reason

  // ID.AM-2: Version Variance
  const versionData = await fetchVersionVariance(snapshotId, apiCall)
  if (versionData) {
    metrics.versionVariance = versionData.variance
    metrics.versionVarianceAvailable = true
    metrics.versionVarianceFamily = versionData.vendor
  }

  // ID.AM-3: IPv4 DNS Coverage
  const dnsCoverageResult = await fetchDnsCoverage(snapshotId, totalDevices, apiCall)
  metrics.ipv4DnsCoveragePercent = dnsCoverageResult.value
  metrics.ipv4DnsCoverageAvailable = dnsCoverageResult.available
  metrics.ipv4DnsCoverageReason = dnsCoverageResult.reason

  // ID.AM-3: Path Lookup Capability
  const pathLookupInfo = await fetchPathLookupAvailability(snapshotId, apiCall)
  metrics.pathLookupAvailable = pathLookupInfo.available
  metrics.pathLookupReason = pathLookupInfo.reason

  return metrics
}

async function fetchBatch2Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<NISTCSFMetrics>> {
  const metrics: Partial<NISTCSFMetrics> = {}

  // PR.AA-01: AAA Servers
  const aaaResult = await fetchAaaPercentage(snapshotId, totalDevices, apiCall)
  metrics.aaaServersPercent = aaaResult.value
  metrics.aaaServersAvailable = aaaResult.available
  metrics.aaaServersReason = aaaResult.reason

  // PR.AA-01: Local Users
  const localUsersResult = await fetchLocalAaaUsersPercentage(snapshotId, totalDevices, apiCall)
  metrics.localUsersPercent = localUsersResult.value
  metrics.localUsersAvailable = localUsersResult.available
  metrics.localUsersReason = localUsersResult.reason

  // PR.PS-02: End of Support
  const eosData = await fetchEndOfSupportSummary(snapshotId, totalDevices, apiCall)
  if (eosData) {
    metrics.endOfSupportPercent = eosData.percentage
    metrics.endOfSupportAvailable = true
  }

  // PR.PS-04: Local Logging
  const localLoggingResult = await fetchLocalLoggingPercentage(snapshotId, totalDevices, apiCall)
  metrics.localLoggingPercent = localLoggingResult.value
  metrics.localLoggingAvailable = localLoggingResult.available
  metrics.localLoggingReason = localLoggingResult.reason

  return metrics
}

async function fetchBatch3Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<NISTCSFMetrics>> {
  const metrics: Partial<NISTCSFMetrics> = {}

  // DE.CM-01: errDisabled
  const errDisabledResult = await fetchErrDisabledPercentage(snapshotId, apiCall)
  metrics.errDisabledPercent = errDisabledResult.value
  metrics.errDisabledAvailable = errDisabledResult.available
  metrics.errDisabledReason = errDisabledResult.reason

  // DE.CM-01: Route Stability
  const unstableRoutesResult = await fetchUnstableRoutesCount(snapshotId, apiCall)
  metrics.unstableRoutesCount = unstableRoutesResult.value
  metrics.unstableRoutesAvailable = unstableRoutesResult.available
  metrics.unstableRoutesReason = unstableRoutesResult.reason

  // DE.CM-06: eBGP Neighbors
  const ebgpResult = await fetchBgpNeighborsCount(snapshotId, apiCall)
  metrics.ebgpNeighborsCount = ebgpResult.value
  metrics.ebgpNeighborsAvailable = ebgpResult.available
  metrics.ebgpNeighborsReason = ebgpResult.reason

  // DE.CM-09: Remote Logging
  const remoteLoggingResult = await fetchRemoteLoggingPercentage(snapshotId, totalDevices, apiCall)
  metrics.remoteLoggingPercent = remoteLoggingResult.value
  metrics.remoteLoggingAvailable = remoteLoggingResult.available
  metrics.remoteLoggingReason = remoteLoggingResult.reason

  return metrics
}

async function fetchBatch4Metrics(
  snapshotId: string,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<NISTCSFMetrics>> {
  const metrics: Partial<NISTCSFMetrics> = {}

  // RS.MI-01: ANY/ANY ACLs
  const anyAnyAclResult = await fetchAnyAnyAclCount(snapshotId, apiCall)
  metrics.anyAnyAclCount = anyAnyAclResult.value
  metrics.anyAnyAclAvailable = anyAnyAclResult.available
  metrics.anyAnyAclReason = anyAnyAclResult.reason

  // RC.RP-05: IPv4 Routes
  const ipv4RoutesResult = await fetchRoutesCount(snapshotId, apiCall)
  metrics.ipv4RoutesCount = ipv4RoutesResult.value
  metrics.ipv4RoutesAvailable = ipv4RoutesResult.available
  metrics.ipv4RoutesReason = ipv4RoutesResult.reason

  // RC.RP-05: IPv6 Routes
  const ipv6RoutesResult = await fetchIPv6RoutesCount(snapshotId, apiCall)
  metrics.ipv6RoutesCount = ipv6RoutesResult.value
  metrics.ipv6RoutesAvailable = ipv6RoutesResult.available
  metrics.ipv6RoutesReason = ipv6RoutesResult.reason

  // RC.RP-05: Config Consistency
  const configResult = await fetchConfigConsistencyCount(snapshotId, apiCall)
  metrics.configChangedCount = configResult.value
  metrics.configChangedAvailable = configResult.available
  metrics.configChangedReason = configResult.reason

  return metrics
}

async function fetchPreviousNISTMetrics(
  snapshotId: string,
  devices: Device[],
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<NISTCSFMetrics['previousMetrics']> {
  const totalDevices = devices.length
  const prevMetrics: NISTCSFMetrics['previousMetrics'] = {
    totalDevices
  }

  try {
    // GV metrics
    const discoveryResult = await fetchDiscoveryErrors(snapshotId, apiCall)
    prevMetrics.discoveryIssues = discoveryResult.data?.count || 0

    // ID metrics
    const siteResult = await fetchSiteCount(snapshotId, apiCall)
    prevMetrics.siteCount = siteResult.value

    const platformResult = await fetchPlatformTypes(snapshotId, apiCall)
    prevMetrics.uniquePlatforms = platformResult.value

    const versionData = await fetchVersionVariance(snapshotId, apiCall)
    prevMetrics.versionVariance = versionData?.variance ?? null

    const dnsResult = await fetchDnsCoverage(snapshotId, totalDevices, apiCall)
    prevMetrics.ipv4DnsCoveragePercent = dnsResult.value

    // PR metrics
    const aaaResult = await fetchAaaPercentage(snapshotId, totalDevices, apiCall)
    prevMetrics.aaaServersPercent = aaaResult.value

    const localUsersResult = await fetchLocalAaaUsersPercentage(snapshotId, totalDevices, apiCall)
    prevMetrics.localUsersPercent = localUsersResult.value

    const eosData = await fetchEndOfSupportSummary(snapshotId, totalDevices, apiCall)
    prevMetrics.endOfSupportPercent = eosData?.percentage ?? null

    const localLoggingResult = await fetchLocalLoggingPercentage(snapshotId, totalDevices, apiCall)
    prevMetrics.localLoggingPercent = localLoggingResult.value

    // DE metrics
    const errDisabledResult = await fetchErrDisabledPercentage(snapshotId, apiCall)
    prevMetrics.errDisabledPercent = errDisabledResult.value

    const unstableResult = await fetchUnstableRoutesCount(snapshotId, apiCall)
    prevMetrics.unstableRoutesCount = unstableResult.value

    const remoteLoggingResult = await fetchRemoteLoggingPercentage(snapshotId, totalDevices, apiCall)
    prevMetrics.remoteLoggingPercent = remoteLoggingResult.value

    // RS metrics
    const anyAnyResult = await fetchAnyAnyAclCount(snapshotId, apiCall)
    prevMetrics.anyAnyAclCount = anyAnyResult.value

    // RC metrics
    const routesResult = await fetchRoutesCount(snapshotId, apiCall)
    prevMetrics.ipv4RoutesCount = routesResult.value

    // Additional DE metrics (eBGP)
    const ebgpResult = await fetchBgpNeighborsCount(snapshotId, apiCall)
    prevMetrics.ebgpNeighborsCount = ebgpResult.value

    // Additional RC metrics (IPv6 routes, config consistency)
    const ipv6Result = await fetchIPv6RoutesCount(snapshotId, apiCall)
    prevMetrics.ipv6RoutesCount = ipv6Result.value

    const configResult = await fetchConfigConsistencyCount(snapshotId, apiCall)
    prevMetrics.configChangedCount = configResult.value
  } catch (error) {
    console.error('[fetchPreviousNISTMetrics] Error:', error)
  }

  return prevMetrics
}

async function calculateNISTMetrics(
  devices: Device[],
  snapshotId: string,
  intentChecksPassed: number,
  intentChecksFailed: number,
  apiCall?: (endpoint: string, options?: any) => Promise<any>
): Promise<NISTCSFMetrics> {
  const totalDevices = devices.length

  // Default metrics
  const metrics: NISTCSFMetrics = {
    totalDevices,
    totalSites: 0,
    intentChecksPassed,
    intentChecksFailed,
    intentChecksTotal: intentChecksPassed + intentChecksFailed,
    discoveryIssues: 0,
    discoveryIssuesAvailable: false,
    deviceCount: totalDevices,
    deviceCountAvailable: true,
    siteCount: null,
    siteCountAvailable: false,
    uniquePlatforms: null,
    uniquePlatformsAvailable: false,
    versionVariance: null,
    versionVarianceAvailable: false,
    ipv4DnsCoveragePercent: null,
    ipv4DnsCoverageAvailable: false,
    ipv6ConfiguredPercent: 100,
    ipv6ConfiguredAvailable: true,
    pathLookupAvailable: false,
    aaaServersPercent: null,
    aaaServersAvailable: false,
    localUsersPercent: null,
    localUsersAvailable: false,
    endOfSupportPercent: null,
    endOfSupportAvailable: false,
    localLoggingPercent: null,
    localLoggingAvailable: false,
    errDisabledPercent: null,
    errDisabledAvailable: false,
    unstableRoutesCount: null,
    unstableRoutesAvailable: false,
    ebgpNeighborsCount: null,
    ebgpNeighborsAvailable: false,
    remoteLoggingPercent: null,
    remoteLoggingAvailable: false,
    anyAnyAclCount: null,
    anyAnyAclAvailable: false,
    ipv4RoutesCount: null,
    ipv4RoutesAvailable: false,
    ipv6RoutesCount: null,
    ipv6RoutesAvailable: false,
    configChangedCount: null,
    configChangedAvailable: false
  }

  if (!apiCall) {
    console.warn('[calculateNISTMetrics] No API available, using defaults')
    return metrics
  }

  // Fetch all batch metrics
  const batch1 = await fetchBatch1Metrics(snapshotId, devices, intentChecksPassed, intentChecksFailed, apiCall)
  const batch2 = await fetchBatch2Metrics(snapshotId, totalDevices, apiCall)
  const batch3 = await fetchBatch3Metrics(snapshotId, totalDevices, apiCall)
  const batch4 = await fetchBatch4Metrics(snapshotId, apiCall)

  return { ...metrics, ...batch1, ...batch2, ...batch3, ...batch4 }
}

// ============================================
// Function Score Calculators
// ============================================

/**
 * GV: GOVERN - Risk management strategy and policy
 * Max score: 5 points
 * Base calculation: 5 points total from 2 subcategories
 */
function calculateGovernScore(metrics: NISTCSFMetrics): { score: number; maxScore: number; status: 'pass' | 'warning'; details: NISTCSFSubcategoryDetail[] } {
  const maxScore = 5
  let rawScore = 0
  const details: NISTCSFSubcategoryDetail[] = []

  // GV.RM-1: Intent Checks (2 points if any checks configured)
  const intentTotal = metrics.intentChecksTotal || (metrics.intentChecksPassed + metrics.intentChecksFailed)
  const intentPoints = intentTotal > 0 ? 2 : 0
  rawScore += intentPoints

  details.push({
    id: 'GV.RM-1',
    name: 'Risk Management Objectives',
    ipFabricContext: 'Intent Checks',
    maxPoints: 2,
    currentValue: intentTotal,
    calculatedPoints: intentPoints,
    scoringRule: '2 points if any Intent Checks are configured'
  })

  // GV.OV-03: Discovery Issues (3 points max with tiered penalty)
  let discoveryPenalty = 0
  if (metrics.discoveryIssues > 30) {
    discoveryPenalty = 3
  } else if (metrics.discoveryIssues > 10) {
    discoveryPenalty = 2
  } else if (metrics.discoveryIssues > 0) {
    discoveryPenalty = 1
  }
  const discoveryPoints = 3 - discoveryPenalty
  rawScore += discoveryPoints

  details.push({
    id: 'GV.OV-03',
    name: 'Risk Management Performance',
    ipFabricContext: 'Discovery Issues',
    maxPoints: 3,
    currentValue: metrics.discoveryIssues,
    previousValue: metrics.previousMetrics?.discoveryIssues,
    delta: metrics.previousMetrics?.discoveryIssues !== undefined
      ? metrics.discoveryIssues - metrics.previousMetrics.discoveryIssues
      : undefined,
    deltaDirection: getDeltaDirection(
      metrics.discoveryIssues,
      metrics.previousMetrics?.discoveryIssues,
      true // reverse polarity - decrease is good
    ),
    calculatedPoints: discoveryPoints,
    scoringRule: '3pts base: 1-10 errors (-1), 11-30 errors (-2), 31+ errors (-3)',
    unavailabilityReason: !metrics.discoveryIssuesAvailable ? metrics.discoveryIssuesReason : undefined
  })

  // Normalize to 5 points max (raw is already 5 max)
  const score = Math.min(maxScore, Math.round(rawScore * 10) / 10)

  return {
    score,
    maxScore,
    status: score >= maxScore * 0.7 ? 'pass' : 'warning',
    details
  }
}

/**
 * ID: IDENTIFY - Asset understanding
 * Max score: 5 points
 * Base calculation: 70 points raw, divide by 14 for final score
 */
function calculateIdentifyScore(metrics: NISTCSFMetrics): { score: number; maxScore: number; status: 'pass' | 'warning'; details: NISTCSFSubcategoryDetail[] } {
  const maxScore = 5
  let rawScore = 0
  const details: NISTCSFSubcategoryDetail[] = []

  // ID.AM-1: Device & Site Inventory (20 points raw: 10 each)
  const devicePoints = metrics.deviceCount > 0 ? 10 : 0
  const sitePoints = (metrics.siteCountAvailable && metrics.siteCount !== null && metrics.siteCount > 0) ? 10 : 0
  rawScore += devicePoints + sitePoints

  details.push({
    id: 'ID.AM-1',
    name: 'Hardware Asset Inventory',
    ipFabricContext: 'Devices & Sites',
    maxPoints: 20,
    calculatedPoints: devicePoints + sitePoints,
    scoringRule: 'Device count >0 (10pts) + Site count >0 (10pts)',
    unavailabilityReason: !metrics.siteCountAvailable ? metrics.siteCountReason : undefined,
    breakdown: [
      {
        metric: 'Device Count',
        value: metrics.deviceCount,
        points: devicePoints,
        rule: '>0 devices = 10 points'
      },
      {
        metric: 'Site Count',
        value: metrics.siteCountAvailable && metrics.siteCount !== null ? metrics.siteCount : 'Data Unavailable',
        points: sitePoints,
        rule: '>0 sites = 10 points'
      }
    ]
  })

  // ID.AM-2: Platform Types & Version Variance (20 points raw)
  const platformPoints = (metrics.uniquePlatformsAvailable && metrics.uniquePlatforms !== null && metrics.uniquePlatforms > 0) ? 10 : 0

  let variancePoints = 0
  if (metrics.versionVarianceAvailable && metrics.versionVariance !== null) {
    if (metrics.versionVariance <= 3) {
      variancePoints = 10
    } else if (metrics.versionVariance <= 5) {
      variancePoints = 7
    } else if (metrics.versionVariance <= 8) {
      variancePoints = 3
    } else if (metrics.versionVariance <= 10) {
      variancePoints = 1
    }
  }
  rawScore += platformPoints + variancePoints

  details.push({
    id: 'ID.AM-2',
    name: 'Software Asset Inventory',
    ipFabricContext: 'Platforms & Version Variance',
    maxPoints: 20,
    calculatedPoints: platformPoints + variancePoints,
    scoringRule: 'Platforms >0 (10pts) + Version variance: 1-3=10, 4-5=7, 6-8=3, 9-10=1, >10=0',
    breakdown: [
      {
        metric: 'Unique Platforms',
        value: metrics.uniquePlatformsAvailable && metrics.uniquePlatforms !== null ? metrics.uniquePlatforms : 'Data Unavailable',
        points: platformPoints,
        rule: '>0 platforms = 10 points'
      },
      {
        metric: 'Version Variance',
        value: metrics.versionVarianceAvailable && metrics.versionVariance !== null
          ? `${metrics.versionVariance} (${metrics.versionVarianceFamily || 'Unknown'})`
          : 'Data Unavailable',
        points: variancePoints,
        rule: '1-3=10, 4-5=7, 6-8=3, 9-10=1, >10=0'
      }
    ]
  })

  // ID.AM-3: Network Communication (30 points raw: DNS 10, IPv6 10, Path 10)
  const dnsPoints = (metrics.ipv4DnsCoverageAvailable && metrics.ipv4DnsCoveragePercent !== null)
    ? Math.round((metrics.ipv4DnsCoveragePercent / 100) * 10 * 10) / 10
    : 0
  const ipv6Points = 10 // Default full points if no IPv6 or all IPv6 is up
  const pathPoints = metrics.pathLookupAvailable ? 10 : 0
  rawScore += dnsPoints + ipv6Points + pathPoints

  details.push({
    id: 'ID.AM-3',
    name: 'Network Communication Flows',
    ipFabricContext: 'IPv4 DNS & Path Lookups',
    maxPoints: 30,
    calculatedPoints: dnsPoints + ipv6Points + pathPoints,
    scoringRule: 'IPv4 DNS % × 10 + IPv6 operational (10) + Path lookup capability (10)',
    breakdown: [
      {
        metric: 'IPv4 DNS Coverage',
        value: metrics.ipv4DnsCoverageAvailable && metrics.ipv4DnsCoveragePercent !== null
          ? `${metrics.ipv4DnsCoveragePercent.toFixed(1)}%`
          : 'Data Unavailable',
        points: dnsPoints,
        rule: 'Coverage % × 10'
      },
      {
        metric: 'IPv6 Operational',
        value: 'Default Pass',
        points: ipv6Points,
        rule: '10 points (default if no IPv6 data)'
      },
      {
        metric: 'Path Lookup',
        value: metrics.pathLookupAvailable ? 'Available' : 'Not Available',
        points: pathPoints,
        rule: 'Available = 10 points'
      }
    ]
  })

  // Normalize: raw max is 70, divide by 14 for score out of 5
  const normalizedScore = Math.min(maxScore, Math.round((rawScore / 14) * 10) / 10)

  return {
    score: normalizedScore,
    maxScore,
    status: normalizedScore >= maxScore * 0.7 ? 'pass' : 'warning',
    details
  }
}

/**
 * PR: PROTECT - Safeguards
 * Max score: 5 points
 * Base calculation: 40 points raw, divide by 8 for final score
 */
function calculateProtectScore(metrics: NISTCSFMetrics): { score: number; maxScore: number; status: 'pass' | 'warning'; details: NISTCSFSubcategoryDetail[] } {
  const maxScore = 5
  let rawScore = 0
  const details: NISTCSFSubcategoryDetail[] = []

  // PR.AA-01: AAA Servers & Local Users (20 points raw: 10 each)
  const aaaPoints = (metrics.aaaServersAvailable && metrics.aaaServersPercent !== null)
    ? Math.round((metrics.aaaServersPercent / 100) * 10 * 10) / 10
    : 0
  const localUserPoints = (metrics.localUsersAvailable && metrics.localUsersPercent !== null)
    ? Math.round((metrics.localUsersPercent / 100) * 10 * 10) / 10
    : 0
  rawScore += aaaPoints + localUserPoints

  details.push({
    id: 'PR.AA-01',
    name: 'Identity and Credential Management',
    ipFabricContext: 'AAA Servers & Local Users',
    maxPoints: 20,
    calculatedPoints: aaaPoints + localUserPoints,
    scoringRule: 'AAA % × 10 + Local users % × 10',
    breakdown: [
      {
        metric: 'AAA Servers Configured',
        value: metrics.aaaServersAvailable && metrics.aaaServersPercent !== null
          ? `${metrics.aaaServersPercent.toFixed(1)}%`
          : 'Data Unavailable',
        points: aaaPoints,
        rule: 'Coverage % × 10',
        previousValue: metrics.previousMetrics?.aaaServersPercent !== null && metrics.previousMetrics?.aaaServersPercent !== undefined
          ? `${metrics.previousMetrics.aaaServersPercent.toFixed(1)}%`
          : undefined,
        delta: metrics.previousMetrics?.aaaServersPercent !== null && metrics.previousMetrics?.aaaServersPercent !== undefined && metrics.aaaServersPercent !== null
          ? `${(metrics.aaaServersPercent - metrics.previousMetrics.aaaServersPercent).toFixed(1)}%`
          : undefined
      },
      {
        metric: 'Local Users Configured',
        value: metrics.localUsersAvailable && metrics.localUsersPercent !== null
          ? `${metrics.localUsersPercent.toFixed(1)}%`
          : 'Data Unavailable',
        points: localUserPoints,
        rule: 'Coverage % × 10'
      }
    ]
  })

  // PR.PS-02: End of Support (10 points raw, reverse polarity)
  const eosPoints = (metrics.endOfSupportAvailable && metrics.endOfSupportPercent !== null)
    ? Math.round(((100 - metrics.endOfSupportPercent) / 100) * 10 * 10) / 10
    : 0
  rawScore += eosPoints

  details.push({
    id: 'PR.PS-02',
    name: 'Software Maintenance',
    ipFabricContext: 'End of Support',
    maxPoints: 10,
    currentValue: metrics.endOfSupportAvailable && metrics.endOfSupportPercent !== null
      ? `${metrics.endOfSupportPercent.toFixed(1)}%`
      : 'Data Unavailable',
    calculatedPoints: eosPoints,
    scoringRule: '(100 - EoS %) × 10 / 10',
    unavailabilityReason: !metrics.endOfSupportAvailable ? metrics.endOfSupportReason : undefined
  })

  // PR.PS-04: Local Logging (10 points raw)
  const loggingPoints = (metrics.localLoggingAvailable && metrics.localLoggingPercent !== null)
    ? Math.round((metrics.localLoggingPercent / 100) * 10 * 10) / 10
    : 0
  rawScore += loggingPoints

  details.push({
    id: 'PR.PS-04',
    name: 'Log Record Generation',
    ipFabricContext: 'Local Logging',
    maxPoints: 10,
    currentValue: metrics.localLoggingAvailable && metrics.localLoggingPercent !== null
      ? `${metrics.localLoggingPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: metrics.previousMetrics?.localLoggingPercent !== null && metrics.previousMetrics?.localLoggingPercent !== undefined
      ? `${metrics.previousMetrics.localLoggingPercent.toFixed(1)}%`
      : undefined,
    delta: metrics.previousMetrics?.localLoggingPercent !== null && metrics.previousMetrics?.localLoggingPercent !== undefined && metrics.localLoggingPercent !== null
      ? `${(metrics.localLoggingPercent - metrics.previousMetrics.localLoggingPercent).toFixed(1)}%`
      : undefined,
    deltaDirection: getDeltaDirection(
      metrics.localLoggingPercent,
      metrics.previousMetrics?.localLoggingPercent
    ),
    calculatedPoints: loggingPoints,
    scoringRule: 'Logging % × 10',
    unavailabilityReason: !metrics.localLoggingAvailable ? metrics.localLoggingReason : undefined
  })

  // Normalize: raw max is 40, divide by 8 for score out of 5
  const normalizedScore = Math.min(maxScore, Math.round((rawScore / 8) * 10) / 10)

  return {
    score: normalizedScore,
    maxScore,
    status: normalizedScore >= maxScore * 0.7 ? 'pass' : 'warning',
    details
  }
}

/**
 * DE: DETECT - Attack detection
 * Max score: 5 points
 * Base calculation: 40 points raw, divide by 8 for final score
 */
function calculateDetectScore(metrics: NISTCSFMetrics): { score: number; maxScore: number; status: 'pass' | 'warning'; details: NISTCSFSubcategoryDetail[] } {
  const maxScore = 5
  let rawScore = 0
  const details: NISTCSFSubcategoryDetail[] = []

  // DE.CM-01: errDisabled & Route Stability (20 points raw: 10 each)
  const errDisabledPoints = (metrics.errDisabledAvailable && metrics.errDisabledPercent !== null)
    ? Math.round(((100 - metrics.errDisabledPercent) / 100) * 10 * 10) / 10
    : 0

  const routeStabilityPoints = (metrics.unstableRoutesAvailable && metrics.unstableRoutesCount !== null)
    ? (metrics.unstableRoutesCount === 0 ? 10 : 0)
    : 0

  rawScore += errDisabledPoints + routeStabilityPoints

  details.push({
    id: 'DE.CM-01',
    name: 'Network Monitoring',
    ipFabricContext: 'errDisabled & Route Stability',
    maxPoints: 20,
    calculatedPoints: errDisabledPoints + routeStabilityPoints,
    scoringRule: '(100 - errDisabled %) × 10 + Route stability (10 if 0 unstable)',
    breakdown: [
      {
        metric: 'errDisabled Ports',
        value: metrics.errDisabledAvailable && metrics.errDisabledPercent !== null
          ? `${metrics.errDisabledPercent.toFixed(1)}%`
          : 'Data Unavailable',
        points: errDisabledPoints,
        rule: '(100 - %) × 10'
      },
      {
        metric: 'Unstable Routes',
        value: metrics.unstableRoutesAvailable && metrics.unstableRoutesCount !== null
          ? metrics.unstableRoutesCount
          : 'Data Unavailable',
        points: routeStabilityPoints,
        rule: '0 unstable = 10 points'
      }
    ]
  })

  // DE.CM-06: eBGP Neighbors (10 points raw, delta-based)
  const ebgpPoints = 0 // Not yet implemented
  rawScore += ebgpPoints

  details.push({
    id: 'DE.CM-06',
    name: 'External Service Provider Monitoring',
    ipFabricContext: 'eBGP Neighbors',
    maxPoints: 10,
    currentValue: 'Not Yet Implemented',
    calculatedPoints: ebgpPoints,
    scoringRule: '10 points if delta ≥ 0',
    requiresComparativeSnapshot: true,
    unavailabilityReason: 'eBGP neighbor monitoring not yet implemented'
  })

  // DE.CM-09: Remote Logging (10 points raw)
  const remoteLoggingPoints = (metrics.remoteLoggingAvailable && metrics.remoteLoggingPercent !== null)
    ? Math.round((metrics.remoteLoggingPercent / 100) * 10 * 10) / 10
    : 0
  rawScore += remoteLoggingPoints

  details.push({
    id: 'DE.CM-09',
    name: 'Computing Environment Monitoring',
    ipFabricContext: 'Remote Logging',
    maxPoints: 10,
    currentValue: metrics.remoteLoggingAvailable && metrics.remoteLoggingPercent !== null
      ? `${metrics.remoteLoggingPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: metrics.previousMetrics?.remoteLoggingPercent !== null && metrics.previousMetrics?.remoteLoggingPercent !== undefined
      ? `${metrics.previousMetrics.remoteLoggingPercent.toFixed(1)}%`
      : undefined,
    delta: metrics.previousMetrics?.remoteLoggingPercent !== null && metrics.previousMetrics?.remoteLoggingPercent !== undefined && metrics.remoteLoggingPercent !== null
      ? `${(metrics.remoteLoggingPercent - metrics.previousMetrics.remoteLoggingPercent).toFixed(1)}%`
      : undefined,
    deltaDirection: getDeltaDirection(
      metrics.remoteLoggingPercent,
      metrics.previousMetrics?.remoteLoggingPercent
    ),
    calculatedPoints: remoteLoggingPoints,
    scoringRule: 'Remote logging % × 10',
    unavailabilityReason: !metrics.remoteLoggingAvailable ? metrics.remoteLoggingReason : undefined
  })

  // Normalize: raw max is 40, divide by 8 for score out of 5
  const normalizedScore = Math.min(maxScore, Math.round((rawScore / 8) * 10) / 10)

  return {
    score: normalizedScore,
    maxScore,
    status: normalizedScore >= maxScore * 0.7 ? 'pass' : 'warning',
    details
  }
}

/**
 * RS: RESPOND - Incident response
 * Max score: 5 points
 * Base calculation: 50 points raw, divide by 10 for final score
 */
function calculateRespondScore(metrics: NISTCSFMetrics): { score: number; maxScore: number; status: 'pass' | 'warning'; details: NISTCSFSubcategoryDetail[] } {
  const maxScore = 5
  let rawScore = 0
  const details: NISTCSFSubcategoryDetail[] = []

  // RS.MI-01: ANY/ANY ACLs (50 points raw, subtract count, min 0)
  const anyAnyCount = metrics.anyAnyAclAvailable && metrics.anyAnyAclCount !== null
    ? metrics.anyAnyAclCount
    : 0
  const anyAnyPoints = Math.max(0, 50 - anyAnyCount)
  rawScore += anyAnyPoints

  details.push({
    id: 'RS.MI-01',
    name: 'Incident Containment',
    ipFabricContext: 'ANY/ANY ACL Policies',
    maxPoints: 50,
    currentValue: metrics.anyAnyAclAvailable && metrics.anyAnyAclCount !== null
      ? metrics.anyAnyAclCount
      : 'Data Unavailable',
    previousValue: metrics.previousMetrics?.anyAnyAclCount ?? undefined,
    delta: metrics.previousMetrics?.anyAnyAclCount !== null && metrics.previousMetrics?.anyAnyAclCount !== undefined && metrics.anyAnyAclCount !== null
      ? metrics.anyAnyAclCount - metrics.previousMetrics.anyAnyAclCount
      : undefined,
    deltaDirection: getDeltaDirection(
      metrics.anyAnyAclCount,
      metrics.previousMetrics?.anyAnyAclCount,
      true // reverse polarity - decrease is good
    ),
    calculatedPoints: anyAnyPoints,
    scoringRule: '50 - ANY/ANY count (min 0)',
    unavailabilityReason: !metrics.anyAnyAclAvailable ? metrics.anyAnyAclReason : undefined
  })

  // Normalize: raw max is 50, divide by 10 for score out of 5
  const normalizedScore = Math.min(maxScore, Math.round((rawScore / 10) * 10) / 10)

  return {
    score: normalizedScore,
    maxScore,
    status: normalizedScore >= maxScore * 0.7 ? 'pass' : 'warning',
    details
  }
}

/**
 * RC: RECOVER - Asset restoration
 * Max score: 5 points
 * Base calculation: 15 points raw, divide by 3 for final score
 */
function calculateRecoverScore(metrics: NISTCSFMetrics): { score: number; maxScore: number; status: 'pass' | 'warning'; details: NISTCSFSubcategoryDetail[] } {
  const maxScore = 5
  let rawScore = 0
  const details: NISTCSFSubcategoryDetail[] = []

  // RC.RP-05: Route Counts & Config Consistency (15 points raw: 5 each)
  // IPv4 Routes: 5 points if delta >= 0
  let ipv4RoutesPoints = 0
  if (metrics.ipv4RoutesAvailable && metrics.ipv4RoutesCount !== null) {
    if (metrics.previousMetrics?.ipv4RoutesCount !== null && metrics.previousMetrics?.ipv4RoutesCount !== undefined) {
      const delta = metrics.ipv4RoutesCount - metrics.previousMetrics.ipv4RoutesCount
      ipv4RoutesPoints = delta >= 0 ? 5 : 0
    } else {
      // No comparison data, give full points
      ipv4RoutesPoints = 5
    }
  }

  // IPv6 Routes: 5 points if delta >= 0 (or full points if not implemented)
  let ipv6RoutesPoints = 5 // Default full points since not implemented

  // Config Consistency: 5 points if delta >= 0 (or full points if not implemented)
  let configPoints = 5 // Default full points since not implemented

  rawScore += ipv4RoutesPoints + ipv6RoutesPoints + configPoints

  details.push({
    id: 'RC.RP-05',
    name: 'Asset Integrity Verification',
    ipFabricContext: 'Routes & Config Consistency',
    maxPoints: 15,
    calculatedPoints: ipv4RoutesPoints + ipv6RoutesPoints + configPoints,
    scoringRule: 'IPv4 routes delta ≥ 0 (5pts) + IPv6 routes delta ≥ 0 (5pts) + Config changed = 0 (5pts)',
    requiresComparativeSnapshot: true,
    breakdown: [
      {
        metric: 'IPv4 Routes',
        value: metrics.ipv4RoutesAvailable && metrics.ipv4RoutesCount !== null
          ? metrics.ipv4RoutesCount
          : 'Data Unavailable',
        points: ipv4RoutesPoints,
        rule: 'Delta ≥ 0 = 5 points',
        previousValue: metrics.previousMetrics?.ipv4RoutesCount ?? undefined,
        delta: metrics.previousMetrics?.ipv4RoutesCount !== null && metrics.previousMetrics?.ipv4RoutesCount !== undefined && metrics.ipv4RoutesCount !== null
          ? metrics.ipv4RoutesCount - metrics.previousMetrics.ipv4RoutesCount
          : undefined
      },
      {
        metric: 'IPv6 Routes',
        value: 'Not Yet Implemented',
        points: ipv6RoutesPoints,
        rule: 'Delta ≥ 0 = 5 points (default pass)'
      },
      {
        metric: 'Config Consistency',
        value: 'Not Yet Implemented',
        points: configPoints,
        rule: 'Changed = 0 = 5 points (default pass)'
      }
    ]
  })

  // Normalize: raw max is 15, divide by 3 for score out of 5
  const normalizedScore = Math.min(maxScore, Math.round((rawScore / 3) * 10) / 10)

  return {
    score: normalizedScore,
    maxScore,
    status: normalizedScore >= maxScore * 0.7 ? 'pass' : 'warning',
    details
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Determine delta direction for display
 */
function getDeltaDirection(
  current: number | null | undefined,
  previous: number | null | undefined,
  reversePolarity: boolean = false
): 'positive' | 'negative' | 'neutral' | undefined {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return undefined
  }

  const diff = current - previous
  if (diff === 0) return 'neutral'

  // Normal polarity: increase is positive
  // Reverse polarity: decrease is positive (for errors, ANY/ANY, etc.)
  if (reversePolarity) {
    return diff < 0 ? 'positive' : 'negative'
  }
  return diff > 0 ? 'positive' : 'negative'
}

/**
 * Extract metrics from already-calculated functions
 * Useful for recalculation without re-fetching
 */
export function extractMetricsFromFunctions(
  functions: NISTCSFFunction[],
  totalDevices: number,
  totalSites: number
): NISTCSFMetrics {
  // This would parse the function details to extract metric values
  // For now, return a minimal metrics object
  return {
    totalDevices,
    totalSites,
    intentChecksPassed: 0,
    intentChecksFailed: 0,
    intentChecksTotal: 0,
    discoveryIssues: 0,
    discoveryIssuesAvailable: false,
    deviceCount: totalDevices,
    deviceCountAvailable: true,
    siteCount: totalSites,
    siteCountAvailable: true,
    uniquePlatforms: null,
    uniquePlatformsAvailable: false,
    versionVariance: null,
    versionVarianceAvailable: false,
    ipv4DnsCoveragePercent: null,
    ipv4DnsCoverageAvailable: false,
    ipv6ConfiguredPercent: null,
    ipv6ConfiguredAvailable: false,
    pathLookupAvailable: false,
    aaaServersPercent: null,
    aaaServersAvailable: false,
    localUsersPercent: null,
    localUsersAvailable: false,
    endOfSupportPercent: null,
    endOfSupportAvailable: false,
    localLoggingPercent: null,
    localLoggingAvailable: false,
    errDisabledPercent: null,
    errDisabledAvailable: false,
    unstableRoutesCount: null,
    unstableRoutesAvailable: false,
    ebgpNeighborsCount: null,
    ebgpNeighborsAvailable: false,
    remoteLoggingPercent: null,
    remoteLoggingAvailable: false,
    anyAnyAclCount: null,
    anyAnyAclAvailable: false,
    ipv4RoutesCount: null,
    ipv4RoutesAvailable: false,
    ipv6RoutesCount: null,
    ipv6RoutesAvailable: false,
    configChangedCount: null,
    configChangedAvailable: false
  }
}

/**
 * Recalculate functions with updated metrics (e.g., when previous snapshot is loaded)
 */
export function recalculateFunctionsWithMetrics(
  metrics: NISTCSFMetrics
): NISTCSFFunction[] {
  return [
    { id: 'GV', name: 'Govern', ...calculateGovernScore(metrics) },
    { id: 'ID', name: 'Identify', ...calculateIdentifyScore(metrics) },
    { id: 'PR', name: 'Protect', ...calculateProtectScore(metrics) },
    { id: 'DE', name: 'Detect', ...calculateDetectScore(metrics) },
    { id: 'RS', name: 'Respond', ...calculateRespondScore(metrics) },
    { id: 'RC', name: 'Recover', ...calculateRecoverScore(metrics) }
  ]
}
