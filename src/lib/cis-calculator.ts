// CIS Controls v8 Calculator based on IP Fabric data
// Based on the CIS Controls gap analysis methodology from the PDF
// Controls 1, 2, and 3 are implemented with real IP Fabric data

import { Device } from './device-generator'

// Helper function to add delay between API calls to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
import {
  DiscoveryErrors,
  VersionConsistency,
  EndOfSupportSummary,
  IntentChecksMetrics,
  fetchDiscoveryErrors,
  fetchVersionVariance,
  fetchEndOfSupportSummary,
  fetchSiteCount,
  fetchPlatformTypes,
  fetchIntentChecksMetrics,
  fetchAnyAnyAclCount,
  fetchDnsCoverage,
  fetchTelnetPercentage,
  fetchRemoteLoggingPercentage,
  fetchAaaPercentage,
  fetchLocalAaaUsersPercentage,
  fetchDnsServersCount,
  fetchLocalLoggingPercentage,
  fetchNtpPercentage,
  fetchZoneFirewallCount,
  fetchFlowCollectionCount,
  fetch8021xPercentage,
  fetchRoutesCount,
  fetchUnstableRoutesCount,
  fetchErrDisabledPercentage,
  fetchPathLookupAvailability
} from '@/services/metrics-api'

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
    // Control 1 previous metrics
    siteCount?: number | null
    siteCountAvailable?: boolean
    uniquePlatforms?: number | null
    uniquePlatformsAvailable?: boolean

    // Control 3 previous metrics
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

    // Control 4 previous metrics
    localAaaUsersPercent?: number | null
    localAaaUsersAvailable?: boolean
    dnsServersCount?: number | null
    dnsServersAvailable?: boolean

    // Control 8 previous metrics
    localLoggingPercent?: number | null
    localLoggingAvailable?: boolean
    ntpPercent?: number | null
    ntpAvailable?: boolean

    // Control 13 previous metrics
    zoneFirewallCount?: number | null
    zoneFirewallAvailable?: boolean
    flowCollectionCount?: number | null
    flowCollectionAvailable?: boolean
    port8021xPercent?: number | null
    port8021xAvailable?: boolean

    // Control 17 previous metrics
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

// Calculate CIS Controls scores based on actual device and network data
export async function calculateCISControls(
  devices: Device[],
  snapshotId: string,
  intentChecksPassed: number,
  intentChecksFailed: number,
  apiCall?: (endpoint: string, options?: any) => Promise<any>,
  previousSnapshotId?: string | null,
  previousDevices?: Device[]
): Promise<CISControl[]> {
  const metrics = await calculateMetrics(devices, snapshotId, intentChecksPassed, intentChecksFailed, apiCall)

  // Fetch previous snapshot metrics for delta calculation
  if (previousSnapshotId && apiCall) {
    try {
      const prevTotalDevices = previousDevices?.length || devices.length

      // Control 1 previous metrics (with throttling to avoid rate limits)
      const prevSiteCountResult = await fetchSiteCount(previousSnapshotId, apiCall)
      await delay(300)
      const prevPlatformTypesResult = await fetchPlatformTypes(previousSnapshotId, apiCall)
      await delay(300)

      // Control 3 previous metrics
      const prevAnyAnyAclResult = await fetchAnyAnyAclCount(previousSnapshotId, apiCall)
      await delay(300)
      const prevDnsCoverageResult = await fetchDnsCoverage(previousSnapshotId, prevTotalDevices, apiCall)
      await delay(300)
      const prevTelnetResult = await fetchTelnetPercentage(previousSnapshotId, prevTotalDevices, apiCall)
      await delay(300)
      const prevRemoteLoggingResult = await fetchRemoteLoggingPercentage(previousSnapshotId, prevTotalDevices, apiCall)
      await delay(300)
      const prevAaaResult = await fetchAaaPercentage(previousSnapshotId, prevTotalDevices, apiCall)

      // Control 4 previous metrics
      await delay(300)
      const prevLocalAaaUsersResult = await fetchLocalAaaUsersPercentage(previousSnapshotId, prevTotalDevices, apiCall)
      await delay(300)
      const prevDnsServersResult = await fetchDnsServersCount(previousSnapshotId, apiCall)

      // Control 8 previous metrics
      await delay(300)
      const prevLocalLoggingResult = await fetchLocalLoggingPercentage(previousSnapshotId, prevTotalDevices, apiCall)
      await delay(300)
      const prevNtpResult = await fetchNtpPercentage(previousSnapshotId, prevTotalDevices, apiCall)

      // Control 12/13 previous metrics
      await delay(300)
      const prevZoneFirewallResult = await fetchZoneFirewallCount(previousSnapshotId, apiCall)

      // Control 13 previous metrics
      await delay(300)
      const prevFlowCollectionResult = await fetchFlowCollectionCount(previousSnapshotId, apiCall)
      await delay(300)
      const prev8021xResult = await fetch8021xPercentage(previousSnapshotId, apiCall)

      // Control 17 previous metrics
      await delay(300)
      const prevRoutesResult = await fetchRoutesCount(previousSnapshotId, apiCall)
      await delay(300)
      const prevUnstableRoutesResult = await fetchUnstableRoutesCount(previousSnapshotId, apiCall)
      await delay(300)
      const prevErrDisabledResult = await fetchErrDisabledPercentage(previousSnapshotId, apiCall)

      metrics.previousMetrics = {
        // Control 1 previous metrics
        siteCount: prevSiteCountResult.value,
        siteCountAvailable: prevSiteCountResult.available,
        uniquePlatforms: prevPlatformTypesResult.value,
        uniquePlatformsAvailable: prevPlatformTypesResult.available,

        // Control 3 previous metrics
        anyAnyAclCount: prevAnyAnyAclResult.value,
        anyAnyAclAvailable: prevAnyAnyAclResult.available,
        dnsCoveragePercent: prevDnsCoverageResult.value,
        dnsCoverageAvailable: prevDnsCoverageResult.available,
        telnetPercent: prevTelnetResult.value,
        telnetAvailable: prevTelnetResult.available,
        remoteLoggingPercent: prevRemoteLoggingResult.value,
        remoteLoggingAvailable: prevRemoteLoggingResult.available,
        aaaPercent: prevAaaResult.value,
        aaaAvailable: prevAaaResult.available,

        // Control 4 previous metrics
        localAaaUsersPercent: prevLocalAaaUsersResult.value,
        localAaaUsersAvailable: prevLocalAaaUsersResult.available,
        dnsServersCount: prevDnsServersResult.value,
        dnsServersAvailable: prevDnsServersResult.available,

        // Control 8 previous metrics
        localLoggingPercent: prevLocalLoggingResult.value,
        localLoggingAvailable: prevLocalLoggingResult.available,
        ntpPercent: prevNtpResult.value,
        ntpAvailable: prevNtpResult.available,

        // Control 13 previous metrics
        zoneFirewallCount: prevZoneFirewallResult.value,
        zoneFirewallAvailable: prevZoneFirewallResult.available,
        flowCollectionCount: prevFlowCollectionResult.value,
        flowCollectionAvailable: prevFlowCollectionResult.available,
        port8021xPercent: prev8021xResult.value,
        port8021xAvailable: prev8021xResult.available,

        // Control 17 previous metrics
        routesCount: prevRoutesResult.value,
        routesAvailable: prevRoutesResult.available,
        unstableRoutesCount: prevUnstableRoutesResult.value,
        unstableRoutesAvailable: prevUnstableRoutesResult.available,
        errDisabledPercent: prevErrDisabledResult.value,
        errDisabledAvailable: prevErrDisabledResult.available
      }
    } catch (error) {
      console.error('[calculateCISControls] Error fetching previous snapshot metrics:', error)
      // Continue without previous metrics
    }
  }

  // Based on CIS Controls v8 framework from the PDF
  // Controls 1, 2, 3, 4, 5, 6, 8, 12, 13, and 17 have real IP Fabric data (98 points total: 10 + 10 + 8 + 10 + 10 + 10 + 10 + 10 + 10 + 10)
  // Note: Control 7 (Continuous Vulnerability Management) is skipped as it's not network-applicable per PDF

  const controls: CISControl[] = [
    {
      id: '1',
      name: 'Inventory and Control of Enterprise Assets',
      ...calculateControl1Score(metrics, devices)
    },
    {
      id: '2',
      name: 'Inventory and Control of Software Assets',
      ...calculateControl2Score(metrics, devices)
    },
    {
      id: '3',
      name: 'Data Protection',
      ...calculateControl3Score(metrics, devices)
    },
    {
      id: '4',
      name: 'Secure Configuration of Enterprise Assets and Software',
      ...calculateControl4Score(metrics, devices)
    },
    {
      id: '5',
      name: 'Account Management',
      ...calculateControl5Score(metrics, devices)
    },
    {
      id: '6',
      name: 'Access Control Management',
      ...calculateControl6Score(metrics, devices)
    },
    {
      id: '8',
      name: 'Audit Log Management',
      ...calculateControl8Score(metrics, devices)
    },
    {
      id: '12',
      name: 'Network Infrastructure Management',
      ...calculateControl12Score(metrics, devices)
    },
    {
      id: '13',
      name: 'Network Monitoring and Defence',
      ...calculateControl13Score(metrics, devices)
    },
    {
      id: '17',
      name: 'Incident Response Management',
      ...calculateControl17Score(metrics, devices)
    }
  ]

  return controls
}

// Batch-specific metric fetchers for progressive loading
async function fetchBatch1Metrics(
  snapshotId: string,
  devices: Device[],
  intentChecksPassed: number,
  intentChecksFailed: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<CISMetrics>> {
  const totalDevices = devices.length
  const metrics: Partial<CISMetrics> = { totalDevices }

  // Control 1, 2, 3 metrics
  const discoveryResult = await fetchDiscoveryErrors(snapshotId, apiCall)
  metrics.discoveryIssues = discoveryResult.data?.count || 0
  await delay(200)

  const versionData = await fetchVersionVariance(snapshotId, apiCall)
  metrics.versionVariance = versionData?.variance || 1
  await delay(200)

  const eosData = await fetchEndOfSupportSummary(snapshotId, totalDevices, apiCall)
  metrics.endOfSupportDevices = eosData?.endOfSupportDevices || 0
  await delay(200)

  const siteCountResult = await fetchSiteCount(snapshotId, apiCall)
  metrics.siteCount = siteCountResult.value
  metrics.siteCountAvailable = siteCountResult.available
  metrics.siteCountReason = siteCountResult.reason
  await delay(200)

  const platformTypesResult = await fetchPlatformTypes(snapshotId, apiCall)
  metrics.uniquePlatforms = platformTypesResult.value
  metrics.uniquePlatformsAvailable = platformTypesResult.available
  metrics.uniquePlatformsReason = platformTypesResult.reason
  await delay(200)

  metrics.intentChecksPassed = intentChecksPassed
  metrics.intentChecksFailed = intentChecksFailed

  // Control 3 specific metrics (with availability tracking)
  const anyAnyAclResult = await fetchAnyAnyAclCount(snapshotId, apiCall)
  metrics.anyAnyAclCount = anyAnyAclResult.value
  metrics.anyAnyAclAvailable = anyAnyAclResult.available
  metrics.anyAnyAclReason = anyAnyAclResult.reason
  await delay(200)

  const dnsCoverageResult = await fetchDnsCoverage(snapshotId, totalDevices, apiCall)
  metrics.dnsCoveragePercent = dnsCoverageResult.value
  metrics.dnsCoverageAvailable = dnsCoverageResult.available
  metrics.dnsCoverageReason = dnsCoverageResult.reason
  await delay(200)

  const telnetResult = await fetchTelnetPercentage(snapshotId, totalDevices, apiCall)
  metrics.telnetPercent = telnetResult.value
  metrics.telnetAvailable = telnetResult.available
  metrics.telnetReason = telnetResult.reason
  await delay(200)

  const remoteLoggingResult = await fetchRemoteLoggingPercentage(snapshotId, totalDevices, apiCall)
  metrics.remoteLoggingPercent = remoteLoggingResult.value
  metrics.remoteLoggingAvailable = remoteLoggingResult.available
  metrics.remoteLoggingReason = remoteLoggingResult.reason
  await delay(200)

  const aaaResult = await fetchAaaPercentage(snapshotId, totalDevices, apiCall)
  metrics.aaaPercent = aaaResult.value
  metrics.aaaAvailable = aaaResult.available
  metrics.aaaReason = aaaResult.reason

  // Control 3.8 Extended - Path Lookups (two-tier detection)
  await delay(200)
  const pathLookupInfo = await fetchPathLookupAvailability(snapshotId, apiCall)
  metrics.pathLookupAvailable = pathLookupInfo.available
  metrics.pathLookupCheckCount = pathLookupInfo.checkCount
  metrics.pathLookupUnavailableReason = pathLookupInfo.reason
  metrics.pathLookupMethod = pathLookupInfo.method

  return metrics
}

async function fetchBatch2Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<CISMetrics>> {
  const metrics: Partial<CISMetrics> = {}

  // Control 4, 5, 6 new metrics (telnet and AAA already fetched in batch 1)
  const localAaaUsersResult = await fetchLocalAaaUsersPercentage(snapshotId, totalDevices, apiCall)
  metrics.localAaaUsersPercent = localAaaUsersResult.value
  metrics.localAaaUsersAvailable = localAaaUsersResult.available
  metrics.localAaaUsersReason = localAaaUsersResult.reason
  await delay(200)

  const dnsServersResult = await fetchDnsServersCount(snapshotId, apiCall)
  metrics.dnsServersCount = dnsServersResult.value
  metrics.dnsServersAvailable = dnsServersResult.available
  metrics.dnsServersReason = dnsServersResult.reason

  return metrics
}

async function fetchBatch3Metrics(
  snapshotId: string,
  totalDevices: number,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<CISMetrics>> {
  const metrics: Partial<CISMetrics> = {}

  // Control 8, 12 new metrics
  const localLoggingResult = await fetchLocalLoggingPercentage(snapshotId, totalDevices, apiCall)
  metrics.localLoggingPercent = localLoggingResult.value
  metrics.localLoggingAvailable = localLoggingResult.available
  metrics.localLoggingReason = localLoggingResult.reason
  await delay(200)

  const ntpResult = await fetchNtpPercentage(snapshotId, totalDevices, apiCall)
  metrics.ntpPercent = ntpResult.value
  metrics.ntpAvailable = ntpResult.available
  metrics.ntpReason = ntpResult.reason
  await delay(200)

  const zoneFirewallResult = await fetchZoneFirewallCount(snapshotId, apiCall)
  metrics.zoneFirewallCount = zoneFirewallResult.value
  metrics.zoneFirewallAvailable = zoneFirewallResult.available
  metrics.zoneFirewallReason = zoneFirewallResult.reason

  return metrics
}

async function fetchBatch4Metrics(
  snapshotId: string,
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<Partial<CISMetrics>> {
  const metrics: Partial<CISMetrics> = {}

  // Control 13, 17 new metrics
  const flowCollectionResult = await fetchFlowCollectionCount(snapshotId, apiCall)
  metrics.flowCollectionCount = flowCollectionResult.value
  metrics.flowCollectionAvailable = flowCollectionResult.available
  metrics.flowCollectionReason = flowCollectionResult.reason
  await delay(200)

  const port8021xResult = await fetch8021xPercentage(snapshotId, apiCall)
  metrics.port8021xPercent = port8021xResult.value
  metrics.port8021xAvailable = port8021xResult.available
  metrics.port8021xReason = port8021xResult.reason
  await delay(200)

  const routesResult = await fetchRoutesCount(snapshotId, apiCall)
  metrics.routesCount = routesResult.value
  metrics.routesAvailable = routesResult.available
  metrics.routesReason = routesResult.reason
  await delay(200)

  const unstableRoutesResult = await fetchUnstableRoutesCount(snapshotId, apiCall)
  metrics.unstableRoutesCount = unstableRoutesResult.value
  metrics.unstableRoutesAvailable = unstableRoutesResult.available
  metrics.unstableRoutesReason = unstableRoutesResult.reason
  await delay(200)

  const errDisabledResult = await fetchErrDisabledPercentage(snapshotId, apiCall)
  metrics.errDisabledPercent = errDisabledResult.value
  metrics.errDisabledAvailable = errDisabledResult.available
  metrics.errDisabledReason = errDisabledResult.reason

  return metrics
}

async function calculateMetrics(
  devices: Device[],
  snapshotId: string,
  intentChecksPassed: number,
  intentChecksFailed: number,
  apiCall?: (endpoint: string, options?: any) => Promise<any>
): Promise<CISMetrics> {
  const totalDevices = devices.length

  // Initialize with fallback values
  let discoveryIssues = 0
  let versionVariance = 1
  let endOfSupportDevices = 0

  // Control 1 metrics with availability tracking
  let siteCount: number | null = null
  let siteCountAvailable = false
  let siteCountReason: string | undefined = undefined
  let uniquePlatforms: number | null = null
  let uniquePlatformsAvailable = false
  let uniquePlatformsReason: string | undefined = undefined

  // Control 3 metrics with availability tracking
  let anyAnyAclCount: number | null = null
  let anyAnyAclAvailable = false
  let anyAnyAclReason: string | undefined = undefined
  let dnsCoveragePercent: number | null = null
  let dnsCoverageAvailable = false
  let dnsCoverageReason: string | undefined = undefined
  let telnetPercent: number | null = null
  let telnetAvailable = false
  let telnetReason: string | undefined = undefined
  let remoteLoggingPercent: number | null = null
  let remoteLoggingAvailable = false
  let remoteLoggingReason: string | undefined = undefined
  let aaaPercent: number | null = null
  let aaaAvailable = false
  let aaaReason: string | undefined = undefined

  // Control 4 metrics with availability tracking
  let localAaaUsersPercent: number | null = null
  let localAaaUsersAvailable = false
  let localAaaUsersReason: string | undefined = undefined
  let dnsServersCount: number | null = null
  let dnsServersAvailable = false
  let dnsServersReason: string | undefined = undefined

  // Control 8 metrics with availability tracking
  let localLoggingPercent: number | null = null
  let localLoggingAvailable = false
  let localLoggingReason: string | undefined = undefined
  let ntpPercent: number | null = null
  let ntpAvailable = false
  let ntpReason: string | undefined = undefined

  // Control 13 metrics with availability tracking
  let zoneFirewallCount: number | null = null
  let zoneFirewallAvailable = false
  let zoneFirewallReason: string | undefined = undefined
  let flowCollectionCount: number | null = null
  let flowCollectionAvailable = false
  let flowCollectionReason: string | undefined = undefined
  let port8021xPercent: number | null = null
  let port8021xAvailable = false
  let port8021xReason: string | undefined = undefined

  // Control 17 metrics with availability tracking
  let routesCount: number | null = null
  let routesAvailable = false
  let routesReason: string | undefined = undefined
  let unstableRoutesCount: number | null = null
  let unstableRoutesAvailable = false
  let unstableRoutesReason: string | undefined = undefined
  let errDisabledPercent: number | null = null
  let errDisabledAvailable = false
  let errDisabledReason: string | undefined = undefined
  let pathLookupAvailable = false
  let pathLookupCheckCount = 0
  let pathLookupUnavailableReason = ''
  let pathLookupMethod: 'path-checks' | 'graph-api' | undefined = undefined

  // If we have API access, fetch real data
  if (apiCall) {
    try {
      // Fetch real discovery errors from IP Fabric
      const discoveryResult = await fetchDiscoveryErrors(snapshotId, apiCall)
      if (discoveryResult.data) {
        discoveryIssues = discoveryResult.data.count
      }
      // Log if data was unavailable
      if (!discoveryResult.availability.available) {
        console.warn('[CIS Calculator] Discovery errors unavailable:', discoveryResult.availability.impact)
      }

      // Fetch real version variance from IP Fabric
      const versionData = await fetchVersionVariance(snapshotId, apiCall)
      if (versionData) {
        versionVariance = versionData.variance
      }

      // Fetch real End of Support summary from IP Fabric
      const eosData = await fetchEndOfSupportSummary(snapshotId, totalDevices, apiCall)
      if (eosData) {
        endOfSupportDevices = eosData.endOfSupportDevices
      }

      // Fetch real site count from IP Fabric
      const siteCountResult = await fetchSiteCount(snapshotId, apiCall)
      siteCount = siteCountResult.value
      siteCountAvailable = siteCountResult.available
      siteCountReason = siteCountResult.reason

      // Fetch real platform types from IP Fabric
      const platformTypesResult = await fetchPlatformTypes(snapshotId, apiCall)
      uniquePlatforms = platformTypesResult.value
      uniquePlatformsAvailable = platformTypesResult.available
      uniquePlatformsReason = platformTypesResult.reason

      // Fetch intent checks metrics if not provided
      if (intentChecksPassed === 0 && intentChecksFailed === 0) {
        const intentMetrics = await fetchIntentChecksMetrics(snapshotId, apiCall)
        if (intentMetrics) {
          intentChecksPassed = intentMetrics.passed
          intentChecksFailed = intentMetrics.failed
        }
      }

      // Fetch Control 3 metrics with 1000ms delays to avoid rate limiting
      const anyAnyAclResult = await fetchAnyAnyAclCount(snapshotId, apiCall)
      anyAnyAclCount = anyAnyAclResult.value
      anyAnyAclAvailable = anyAnyAclResult.available
      anyAnyAclReason = anyAnyAclResult.reason
      await delay(1000)

      const dnsCoverageResult = await fetchDnsCoverage(snapshotId, totalDevices, apiCall)
      dnsCoveragePercent = dnsCoverageResult.value
      dnsCoverageAvailable = dnsCoverageResult.available
      dnsCoverageReason = dnsCoverageResult.reason
      await delay(1000)

      const telnetResult = await fetchTelnetPercentage(snapshotId, totalDevices, apiCall)
      telnetPercent = telnetResult.value
      telnetAvailable = telnetResult.available
      telnetReason = telnetResult.reason
      await delay(1000)

      const remoteLoggingResult = await fetchRemoteLoggingPercentage(snapshotId, totalDevices, apiCall)
      remoteLoggingPercent = remoteLoggingResult.value
      remoteLoggingAvailable = remoteLoggingResult.available
      remoteLoggingReason = remoteLoggingResult.reason
      await delay(1000)

      const aaaResult = await fetchAaaPercentage(snapshotId, totalDevices, apiCall)
      aaaPercent = aaaResult.value
      aaaAvailable = aaaResult.available
      aaaReason = aaaResult.reason

      // Fetch Control 4 metrics
      await delay(1000)
      const localAaaUsersResult = await fetchLocalAaaUsersPercentage(snapshotId, totalDevices, apiCall)
      localAaaUsersPercent = localAaaUsersResult.value
      localAaaUsersAvailable = localAaaUsersResult.available
      localAaaUsersReason = localAaaUsersResult.reason
      await delay(1000)

      const dnsServersResult = await fetchDnsServersCount(snapshotId, apiCall)
      dnsServersCount = dnsServersResult.value
      dnsServersAvailable = dnsServersResult.available
      dnsServersReason = dnsServersResult.reason

      // Fetch Control 8 metrics
      await delay(1000)
      const localLoggingResult = await fetchLocalLoggingPercentage(snapshotId, totalDevices, apiCall)
      localLoggingPercent = localLoggingResult.value
      localLoggingAvailable = localLoggingResult.available
      localLoggingReason = localLoggingResult.reason
      await delay(1000)

      const ntpResult = await fetchNtpPercentage(snapshotId, totalDevices, apiCall)
      ntpPercent = ntpResult.value
      ntpAvailable = ntpResult.available
      ntpReason = ntpResult.reason

      // Fetch Control 12/13 metrics
      await delay(1000)
      const zoneFirewallResult = await fetchZoneFirewallCount(snapshotId, apiCall)
      zoneFirewallCount = zoneFirewallResult.value
      zoneFirewallAvailable = zoneFirewallResult.available
      zoneFirewallReason = zoneFirewallResult.reason

      // Fetch Control 13 metrics
      await delay(1000)
      const flowCollectionResult = await fetchFlowCollectionCount(snapshotId, apiCall)
      flowCollectionCount = flowCollectionResult.value
      flowCollectionAvailable = flowCollectionResult.available
      flowCollectionReason = flowCollectionResult.reason
      await delay(1000)

      const port8021xResult = await fetch8021xPercentage(snapshotId, apiCall)
      port8021xPercent = port8021xResult.value
      port8021xAvailable = port8021xResult.available
      port8021xReason = port8021xResult.reason

      // Fetch Control 17 metrics
      await delay(1000)
      const routesResult = await fetchRoutesCount(snapshotId, apiCall)
      routesCount = routesResult.value
      routesAvailable = routesResult.available
      routesReason = routesResult.reason
      await delay(1000)

      const unstableRoutesResult = await fetchUnstableRoutesCount(snapshotId, apiCall)
      unstableRoutesCount = unstableRoutesResult.value
      unstableRoutesAvailable = unstableRoutesResult.available
      unstableRoutesReason = unstableRoutesResult.reason
      await delay(1000)

      const errDisabledResult = await fetchErrDisabledPercentage(snapshotId, apiCall)
      errDisabledPercent = errDisabledResult.value
      errDisabledAvailable = errDisabledResult.available
      errDisabledReason = errDisabledResult.reason
    } catch (error) {
      console.error('[calculateMetrics] Error fetching metrics from IP Fabric:', error)
    }
  } else {
    // Fallback only when no API is available - calculate from device data
    // This should only happen in demo mode
    console.warn('[calculateMetrics] No API available, using device-based calculations')

    // Calculate from devices (less accurate than API)
    uniquePlatforms = new Set(devices.map(d => d.vendor)).size
    siteCount = new Set(devices.map(d => d.site)).size

    // For discovery issues, use device issues as proxy (not accurate)
    discoveryIssues = devices.filter(d => d.issues > 0).length

    // For version variance, calculate from device versions
    const versionsByVendor = devices.reduce((acc, d) => {
      if (!acc[d.vendor]) acc[d.vendor] = new Set()
      acc[d.vendor].add(d.version)
      return acc
    }, {} as Record<string, Set<string>>)

    versionVariance = Math.max(
      1,
      ...Object.values(versionsByVendor).map(v => v.size)
    )

    // For EoS, count devices with older versions (not accurate)
    const oldVersionPatterns = ['15.', '16.', '6.0', '6.2', '7.0', '10.', '11.']
    endOfSupportDevices = devices.filter(d =>
      oldVersionPatterns.some(pattern => d.version.includes(pattern))
    ).length
  }

  return {
    totalDevices,
    discoveryIssues,
    versionVariance,
    endOfSupportDevices,
    intentChecksPassed,
    intentChecksFailed,

    // Control 1 metrics with availability
    siteCount,
    siteCountAvailable,
    siteCountReason,
    uniquePlatforms,
    uniquePlatformsAvailable,
    uniquePlatformsReason,

    // Control 3 metrics with availability
    anyAnyAclCount,
    anyAnyAclAvailable,
    anyAnyAclReason,
    dnsCoveragePercent,
    dnsCoverageAvailable,
    dnsCoverageReason,
    telnetPercent,
    telnetAvailable,
    telnetReason,
    remoteLoggingPercent,
    remoteLoggingAvailable,
    remoteLoggingReason,
    aaaPercent,
    aaaAvailable,
    aaaReason,

    // Control 4 metrics with availability
    localAaaUsersPercent,
    localAaaUsersAvailable,
    localAaaUsersReason,
    dnsServersCount,
    dnsServersAvailable,
    dnsServersReason,

    // Control 8 metrics with availability
    localLoggingPercent,
    localLoggingAvailable,
    localLoggingReason,
    ntpPercent,
    ntpAvailable,
    ntpReason,

    // Control 13 metrics with availability
    zoneFirewallCount,
    zoneFirewallAvailable,
    zoneFirewallReason,
    flowCollectionCount,
    flowCollectionAvailable,
    flowCollectionReason,
    port8021xPercent,
    port8021xAvailable,
    port8021xReason,

    // Control 17 metrics with availability
    routesCount,
    routesAvailable,
    routesReason,
    unstableRoutesCount,
    unstableRoutesAvailable,
    unstableRoutesReason,
    errDisabledPercent,
    errDisabledAvailable,
    errDisabledReason,
    pathLookupAvailable,
    pathLookupCheckCount,
    pathLookupUnavailableReason,
    pathLookupMethod
  }
}

// Control 1: Inventory and Control of Enterprise Assets (Score: 0-10)
// Based on PDF: 1.1 Device inventory (6pts total - 3 for devices, 3 for sites),
// 1.2 Discovery issues (3pts with tiered penalty), 1.3 Intent checks (1pt)
function calculateControl1Score(metrics: CISMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 10
  const details: CISControlDetail[] = []

  // 1.1: Device inventory - Devices Count (3 points if > 0 devices)
  const devicePoints = metrics.totalDevices > 0 ? 3 : 0
  const sitePoints = (metrics.siteCountAvailable && metrics.siteCount !== null && metrics.siteCount > 0)
    ? 3
    : 0  // No points if data unavailable
  score += devicePoints + sitePoints

  // 1.2: Discovery issues penalty (3 points with tiered deductions)
  // PDF specifies: 0-10 errors = -1, 11-30 errors = -2, 31+ errors = -3
  let discoveryPenalty = 0
  if (metrics.discoveryIssues > 30) {
    discoveryPenalty = 3
  } else if (metrics.discoveryIssues > 10) {
    discoveryPenalty = 2
  } else if (metrics.discoveryIssues > 0) {
    discoveryPenalty = 1
  }
  const discoveryPoints = 3 - discoveryPenalty
  score += discoveryPoints

  // 1.3: Intent checks configured (1 point if > 0 intent checks)
  const totalIntentChecks = metrics.intentChecksPassed + metrics.intentChecksFailed
  const intentPoints = totalIntentChecks > 0 ? 1 : 0
  score += intentPoints

  // Build details for transparency
  details.push({
    id: '1.1',
    name: 'Establish and Maintain Detailed Enterprise Asset Inventory',
    ipFabricContext: 'Devices & Sites',
    maxPoints: 6,
    calculatedPoints: devicePoints + sitePoints,
    scoringRule: 'Device count >0 (3pts) + Site count >0 (3pts)',
    unavailabilityReason: !metrics.siteCountAvailable ? `Sites: ${metrics.siteCountReason}` : undefined,
    breakdown: [
      {
        metric: 'Device Count',
        value: metrics.totalDevices,
        points: devicePoints,
        rule: '>0 devices = 3 points'
      },
      {
        metric: 'Site Count',
        value: metrics.siteCountAvailable && metrics.siteCount !== null
          ? metrics.siteCount
          : 'Data Unavailable',
        points: sitePoints,
        rule: '>0 sites = 3 points'
      }
    ]
  })

  details.push({
    id: '1.2',
    name: 'Address Unauthorized Assets',
    ipFabricContext: 'Discovery Issues',
    maxPoints: 3,
    currentValue: metrics.discoveryIssues,
    calculatedPoints: discoveryPoints,
    scoringRule: '3 points minus penalty: 0-10 errors (-1), 11-30 errors (-2), 31+ errors (-3)'
  })

  details.push({
    id: '1.3',
    name: 'Utilize an Active Discovery Tool',
    ipFabricContext: 'Intent Checks',
    maxPoints: 1,
    currentValue: totalIntentChecks,
    calculatedPoints: intentPoints,
    scoringRule: '>0 intent checks = 1 point'
  })

  // Round to 1 decimal place
  score = Math.round(score * 10) / 10

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

// Control 2: Inventory and Control of Software Assets (Score: 0-10)
// Based on PDF: 2.1/2.4 Platform inventory (6pts - 4 for platforms, 2 for version variance),
// 2.2 Lifecycle management (4pts)
function calculateControl2Score(metrics: CISMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 10
  const details: CISControlDetail[] = []

  // 2.1/2.4: Software inventory - Unique Platforms (4 points if platforms tracked)
  const platformPoints = (metrics.uniquePlatformsAvailable && metrics.uniquePlatforms !== null && metrics.uniquePlatforms > 0)
    ? 4
    : 0  // No points if data unavailable
  score += platformPoints

  // 2.1/2.4: Version Variance (2 points based on variance)
  // PDF specifies: 1-3 versions = full score, 3-5 = 1 point, 6-10+ = 0 points
  let variancePoints = 0
  if (metrics.versionVariance <= 3) {
    variancePoints = 2
  } else if (metrics.versionVariance <= 5) {
    variancePoints = 1
  }
  score += variancePoints

  // 2.2: Lifecycle management (4 points, reduced by EoS percentage)
  // PDF formula from corrected calculation: Score = 4 × (1 - EoS_percentage/100)
  // Example: 8% EoS = 4 × 0.92 = 3.68
  // Uses IP Fabric's native EoS API for accurate detection
  const eosPercentage = metrics.totalDevices > 0
    ? (metrics.endOfSupportDevices / metrics.totalDevices) * 100
    : 0
  const lifecycleScore = Math.max(0, 4 * (1 - eosPercentage / 100))
  score += lifecycleScore

  // Build details for transparency
  details.push({
    id: '2.1/2.4',
    name: 'Establish and Maintain Software Inventory',
    ipFabricContext: 'Platform Types & Version Variance',
    maxPoints: 6,
    calculatedPoints: platformPoints + variancePoints,
    scoringRule: 'Platform types >0 (4pts) + Version variance scoring',
    unavailabilityReason: !metrics.uniquePlatformsAvailable ? `Platforms: ${metrics.uniquePlatformsReason}` : undefined,
    breakdown: [
      {
        metric: 'Unique Platform Types',
        value: metrics.uniquePlatformsAvailable && metrics.uniquePlatforms !== null
          ? metrics.uniquePlatforms
          : 'Data Unavailable',
        points: platformPoints,
        rule: '>0 platforms = 4 points'
      },
      {
        metric: 'Version Variance',
        value: metrics.versionVariance,
        points: variancePoints,
        rule: '1-3 versions = 2pts, 4-5 = 1pt, 6+ = 0pts'
      }
    ]
  })

  details.push({
    id: '2.2',
    name: 'Software Lifecycle Management',
    ipFabricContext: 'End of Support Devices',
    maxPoints: 4,
    currentValue: `${metrics.endOfSupportDevices} devices (${eosPercentage.toFixed(1)}%)`,
    calculatedPoints: Math.round(lifecycleScore * 100) / 100,
    scoringRule: '4 points - (EoS% × 0.04)'
  })

  score = Math.round(score * 10) / 10

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

// Control 3: Data Protection (Score: 0-10)
// Based on PDF: 3.3 ACL ANY/ANY (2pts), 3.8 DNS coverage (2pts), 3.8 Extended Path Lookups (2pts),
// 3.10 Telnet usage (2pts), 3.14 Remote logging + AAA (1pt + 1pt = 2pts)
function calculateControl3Score(metrics: CISMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 10  // Changed from 8 to include 3.8 Extended
  const details: CISControlDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // Calculate delta for 3.3 (only if both current and previous have data)
  const anyAnyDelta = (
    metrics.anyAnyAclAvailable &&
    metrics.anyAnyAclCount !== null &&
    prevMetrics?.anyAnyAclAvailable &&
    prevMetrics?.anyAnyAclCount !== null
  ) ? metrics.anyAnyAclCount - prevMetrics.anyAnyAclCount! : undefined

  const anyAnyDeltaDirection = anyAnyDelta !== undefined
    ? (anyAnyDelta < 0 ? 'positive' : anyAnyDelta > 0 ? 'negative' : 'neutral')
    : undefined

  // 3.3: Configure Data Access Control Lists - ANY/ANY policies (2 points)
  // Target: Delta ≤ 0 (fewer ANY/ANY rules is better - reverse polarity)
  // Score formula: If Delta ≤ 0 or no previous data, calculate (20 - count) / 10, max 2, min 0
  //                If Delta > 0, award 0 points (increased ANY/ANY rules is bad)
  const anyAnyScore = (metrics.anyAnyAclAvailable && metrics.anyAnyAclCount !== null)
    ? (anyAnyDelta === undefined || anyAnyDelta <= 0
        ? (metrics.anyAnyAclCount >= 20 ? 0 : Math.max(0, (20 - metrics.anyAnyAclCount) / 10))
        : 0)  // Delta > 0 means more ANY/ANY rules = 0 points
    : 0  // No points if data unavailable
  score += anyAnyScore

  details.push({
    id: '3.3',
    name: 'Configure Data Access Control Lists',
    ipFabricContext: 'ACL policies that permit ANY/ANY',
    maxPoints: 2,
    currentValue: metrics.anyAnyAclAvailable && metrics.anyAnyAclCount !== null
      ? metrics.anyAnyAclCount
      : 'Data Unavailable',
    previousValue: prevMetrics?.anyAnyAclAvailable && prevMetrics?.anyAnyAclCount !== null
      ? prevMetrics.anyAnyAclCount
      : undefined,
    delta: anyAnyDelta,
    deltaDirection: anyAnyDeltaDirection,
    calculatedPoints: Math.round(anyAnyScore * 100) / 100,
    scoringRule: '(20 - count) / 10, max 2 points. Score 0 if count ≥ 20',
    unavailabilityReason: !metrics.anyAnyAclAvailable ? metrics.anyAnyAclReason : undefined
  })

  // 3.8: Document Data Flows - DNS coverage (2 points)
  // Score formula: percentage × 2 (e.g., 84% = 1.68 points)
  const dnsScore = (metrics.dnsCoverageAvailable && metrics.dnsCoveragePercent !== null)
    ? (metrics.dnsCoveragePercent / 100) * 2
    : 0  // No points if data unavailable
  score += dnsScore

  // Calculate delta for 3.8 (only if both current and previous have data)
  const dnsDelta = (
    metrics.dnsCoverageAvailable &&
    metrics.dnsCoveragePercent !== null &&
    prevMetrics?.dnsCoverageAvailable &&
    prevMetrics?.dnsCoveragePercent !== null
  ) ? Number((metrics.dnsCoveragePercent - prevMetrics.dnsCoveragePercent!).toFixed(1)) : undefined

  const dnsDeltaDirection = dnsDelta !== undefined
    ? (dnsDelta > 0 ? 'positive' : dnsDelta < 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '3.8',
    name: 'Document Data Flows',
    ipFabricContext: 'Device Based IPv4 Addresses in DNS',
    maxPoints: 2,
    currentValue: metrics.dnsCoverageAvailable && metrics.dnsCoveragePercent !== null
      ? `${metrics.dnsCoveragePercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.dnsCoverageAvailable && prevMetrics?.dnsCoveragePercent !== null
      ? `${prevMetrics.dnsCoveragePercent!.toFixed(1)}%`
      : undefined,
    delta: dnsDelta !== undefined ? `${dnsDelta > 0 ? '+' : ''}${dnsDelta}%` : undefined,
    deltaDirection: dnsDeltaDirection,
    calculatedPoints: Math.round(dnsScore * 100) / 100,
    scoringRule: 'Percentage × 2 points (target: 100%)',
    unavailabilityReason: !metrics.dnsCoverageAvailable ? metrics.dnsCoverageReason : undefined
  })

  // 3.10: Encrypt Sensitive Data in Transit - Telnet usage (2 points)
  // Score formula: (100 - percentage) × 0.02 (e.g., 3% telnet = 97% × 0.02 = 1.94 points)
  // Reverse polarity: lower telnet usage is better
  const telnetScore = (metrics.telnetAvailable && metrics.telnetPercent !== null)
    ? ((100 - metrics.telnetPercent) / 100) * 2
    : 0  // No points if data unavailable (CRITICAL: prevents perfect score on API failure!)
  score += telnetScore

  // Calculate delta for 3.10 (only if both current and previous have data)
  const telnetDelta = (
    metrics.telnetAvailable &&
    metrics.telnetPercent !== null &&
    prevMetrics?.telnetAvailable &&
    prevMetrics?.telnetPercent !== null
  ) ? Number((metrics.telnetPercent - prevMetrics.telnetPercent!).toFixed(1)) : undefined

  const telnetDeltaDirection = telnetDelta !== undefined
    ? (telnetDelta < 0 ? 'positive' : telnetDelta > 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '3.10',
    name: 'Encrypt Sensitive Data in Transit',
    ipFabricContext: 'Clear text telnet protocol enabled',
    maxPoints: 2,
    currentValue: metrics.telnetAvailable && metrics.telnetPercent !== null
      ? `${metrics.telnetPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.telnetAvailable && prevMetrics?.telnetPercent !== null
      ? `${prevMetrics.telnetPercent!.toFixed(1)}%`
      : undefined,
    delta: telnetDelta !== undefined ? `${telnetDelta > 0 ? '+' : ''}${telnetDelta}%` : undefined,
    deltaDirection: telnetDeltaDirection,
    calculatedPoints: Math.round(telnetScore * 100) / 100,
    scoringRule: '(100 - percentage) × 2 points (target: 0%)',
    unavailabilityReason: !metrics.telnetAvailable ? metrics.telnetReason : undefined
  })

  // 3.14: Log Sensitive Data Access - Remote logging (1 point) + AAA (1 point)
  // Part 1: Remote logging - percentage × 1
  const remoteLoggingScore = (metrics.remoteLoggingAvailable && metrics.remoteLoggingPercent !== null)
    ? (metrics.remoteLoggingPercent / 100) * 1
    : 0  // No points if data unavailable

  // Part 2: AAA configuration - percentage × 1
  const aaaScore = (metrics.aaaAvailable && metrics.aaaPercent !== null)
    ? (metrics.aaaPercent / 100) * 1
    : 0  // No points if data unavailable

  const logging314Score = remoteLoggingScore + aaaScore
  score += logging314Score

  // Calculate deltas for 3.14 parts (only if both current and previous have data)
  const remoteLoggingDelta = (
    metrics.remoteLoggingAvailable &&
    metrics.remoteLoggingPercent !== null &&
    prevMetrics?.remoteLoggingAvailable &&
    prevMetrics?.remoteLoggingPercent !== null
  ) ? Number((metrics.remoteLoggingPercent - prevMetrics.remoteLoggingPercent!).toFixed(1)) : undefined

  const aaaDelta = (
    metrics.aaaAvailable &&
    metrics.aaaPercent !== null &&
    prevMetrics?.aaaAvailable &&
    prevMetrics?.aaaPercent !== null
  ) ? Number((metrics.aaaPercent - prevMetrics.aaaPercent!).toFixed(1)) : undefined

  // Build combined current/previous values
  const currentRemoteValue = metrics.remoteLoggingAvailable && metrics.remoteLoggingPercent !== null
    ? `${metrics.remoteLoggingPercent.toFixed(1)}%`
    : 'N/A'
  const currentAaaValue = metrics.aaaAvailable && metrics.aaaPercent !== null
    ? `${metrics.aaaPercent.toFixed(1)}%`
    : 'N/A'
  const prevRemoteValue = prevMetrics?.remoteLoggingAvailable && prevMetrics?.remoteLoggingPercent !== null
    ? `${prevMetrics.remoteLoggingPercent!.toFixed(1)}%`
    : undefined
  const prevAaaValue = prevMetrics?.aaaAvailable && prevMetrics?.aaaPercent !== null
    ? `${prevMetrics.aaaPercent!.toFixed(1)}%`
    : undefined

  details.push({
    id: '3.14',
    name: 'Log Sensitive Data Access',
    ipFabricContext: 'Remote Logging & AAA Servers',
    maxPoints: 2,
    currentValue: `Remote: ${currentRemoteValue}, AAA: ${currentAaaValue}`,
    previousValue: (prevRemoteValue || prevAaaValue)
      ? `Remote: ${prevRemoteValue || 'N/A'}, AAA: ${prevAaaValue || 'N/A'}`
      : undefined,
    calculatedPoints: Math.round(logging314Score * 100) / 100,
    scoringRule: 'Remote logging (1pt) + AAA (1pt) based on percentages',
    unavailabilityReason: (!metrics.remoteLoggingAvailable || !metrics.aaaAvailable)
      ? [
          !metrics.remoteLoggingAvailable ? `Remote Logging: ${metrics.remoteLoggingReason}` : null,
          !metrics.aaaAvailable ? `AAA: ${metrics.aaaReason}` : null
        ].filter(Boolean).join('; ')
      : undefined,
    breakdown: [
      {
        metric: 'Remote Logging Coverage',
        value: metrics.remoteLoggingAvailable && metrics.remoteLoggingPercent !== null
          ? `${metrics.remoteLoggingPercent.toFixed(1)}%`
          : 'Data Unavailable',
        previousValue: prevRemoteValue,
        delta: remoteLoggingDelta !== undefined
          ? `${remoteLoggingDelta > 0 ? '+' : ''}${remoteLoggingDelta}%`
          : undefined,
        points: Math.round(remoteLoggingScore * 100) / 100,
        rule: 'Percentage × 1 point (target: 100%)'
      },
      {
        metric: 'AAA Configuration',
        value: metrics.aaaAvailable && metrics.aaaPercent !== null
          ? `${metrics.aaaPercent.toFixed(1)}%`
          : 'Data Unavailable',
        previousValue: prevAaaValue,
        delta: aaaDelta !== undefined
          ? `${aaaDelta > 0 ? '+' : ''}${aaaDelta}%`
          : undefined,
        points: Math.round(aaaScore * 100) / 100,
        rule: 'Percentage × 1 point'
      }
    ]
  })

  // 3.8 Extended: Document Data Flows - Path Visualization (2 points)
  // Graceful degradation: awards 2 points if available, 0 if not
  const pathLookupScore = metrics.pathLookupAvailable ? 2 : 0
  score += pathLookupScore

  // Create current value message based on detection method
  let currentValueMessage = 'Not Available'
  if (metrics.pathLookupAvailable) {
    if (metrics.pathLookupMethod === 'path-checks') {
      currentValueMessage = `Available (${metrics.pathLookupCheckCount || 0} path checks configured)`
    } else if (metrics.pathLookupMethod === 'graph-api') {
      currentValueMessage = 'Available (network graph API accessible)'
    } else {
      currentValueMessage = 'Available'
    }
  }

  details.push({
    id: '3.8-extended',
    name: 'Document Data Flows - Path Visualization',
    ipFabricContext: 'Network Path Lookups',
    maxPoints: 2,
    currentValue: currentValueMessage,
    previousValue: prevMetrics?.pathLookupAvailable !== undefined
      ? (prevMetrics.pathLookupAvailable ? 'Available' : 'Not Available')
      : undefined,
    calculatedPoints: pathLookupScore,
    scoringRule: '2 points if path checks configured OR graph API accessible, else 0 (two-tier detection)',
    unavailabilityReason: metrics.pathLookupUnavailableReason
  })

  score = Math.round(score * 10) / 10

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

// Control 4: Secure Configuration of Enterprise Assets and Software (Score: 0-10)
// Based on PDF: 4.6 Telnet usage (4pts), 4.7 Local AAA users (4pts), 4.9 DNS servers (2pts)
function calculateControl4Score(metrics: CISMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 10
  const details: CISControlDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // 4.6: Securely Manage Enterprise Assets and Software - Telnet usage (4 points)
  // Score formula: (100 - percentage) × 0.04 (e.g., 3% telnet = 97% × 0.04 = 3.88 points)
  // Reverse polarity: lower telnet usage is better
  const telnetScore46 = (metrics.telnetAvailable && metrics.telnetPercent !== null)
    ? ((100 - metrics.telnetPercent) / 100) * 4
    : 0  // No points if data unavailable
  score += telnetScore46

  // Calculate delta for 4.6 (only if both current and previous have data)
  const telnetDelta46 = (
    metrics.telnetAvailable &&
    metrics.telnetPercent !== null &&
    prevMetrics?.telnetAvailable &&
    prevMetrics?.telnetPercent !== null
  ) ? Number((metrics.telnetPercent - prevMetrics.telnetPercent!).toFixed(1)) : undefined

  const telnetDeltaDirection46 = telnetDelta46 !== undefined
    ? (telnetDelta46 < 0 ? 'positive' : telnetDelta46 > 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '4.6',
    name: 'Securely Manage Enterprise Assets and Software',
    ipFabricContext: 'Clear text telnet protocol enabled',
    maxPoints: 4,
    currentValue: metrics.telnetAvailable && metrics.telnetPercent !== null
      ? `${metrics.telnetPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.telnetAvailable && prevMetrics?.telnetPercent !== null
      ? `${prevMetrics.telnetPercent!.toFixed(1)}%`
      : undefined,
    delta: telnetDelta46 !== undefined ? `${telnetDelta46 > 0 ? '+' : ''}${telnetDelta46}%` : undefined,
    deltaDirection: telnetDeltaDirection46,
    calculatedPoints: Math.round(telnetScore46 * 100) / 100,
    scoringRule: '(100 - percentage) × 4 points (target: 0%)',
    unavailabilityReason: !metrics.telnetAvailable ? metrics.telnetReason : undefined
  })

  // 4.7: Manage Default Accounts - Local AAA users (4 points)
  // Score formula: percentage × 4 (e.g., 52% = 2.08 points)
  const localUsersScore = (metrics.localAaaUsersAvailable && metrics.localAaaUsersPercent !== null)
    ? (metrics.localAaaUsersPercent / 100) * 4
    : 0  // No points if data unavailable
  score += localUsersScore

  // Calculate delta for 4.7 (only if both current and previous have data)
  const localUsersDelta = (
    metrics.localAaaUsersAvailable &&
    metrics.localAaaUsersPercent !== null &&
    prevMetrics?.localAaaUsersAvailable &&
    prevMetrics?.localAaaUsersPercent !== null
  ) ? Number((metrics.localAaaUsersPercent - prevMetrics.localAaaUsersPercent!).toFixed(1)) : undefined

  const localUsersDeltaDirection = localUsersDelta !== undefined
    ? (localUsersDelta > 0 ? 'positive' : localUsersDelta < 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '4.7',
    name: 'Manage Default Accounts on Enterprise Assets and Software',
    ipFabricContext: 'LOCAL user authentication accounts',
    maxPoints: 4,
    currentValue: metrics.localAaaUsersAvailable && metrics.localAaaUsersPercent !== null
      ? `${metrics.localAaaUsersPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.localAaaUsersAvailable && prevMetrics?.localAaaUsersPercent !== null
      ? `${prevMetrics.localAaaUsersPercent!.toFixed(1)}%`
      : undefined,
    delta: localUsersDelta !== undefined ? `${localUsersDelta > 0 ? '+' : ''}${localUsersDelta}%` : undefined,
    deltaDirection: localUsersDeltaDirection,
    calculatedPoints: Math.round(localUsersScore * 100) / 100,
    scoringRule: 'Percentage × 4 points (backup accounts for DR)',
    unavailabilityReason: !metrics.localAaaUsersAvailable ? metrics.localAaaUsersReason : undefined
  })

  // Calculate delta for 4.9 (only if both current and previous have data)
  const dnsDelta49 = (
    metrics.dnsServersAvailable &&
    metrics.dnsServersCount !== null &&
    prevMetrics?.dnsServersAvailable &&
    prevMetrics?.dnsServersCount !== null
  ) ? metrics.dnsServersCount - prevMetrics.dnsServersCount! : undefined

  const dnsDeltaDirection49 = dnsDelta49 !== undefined
    ? (dnsDelta49 > 0 ? 'positive' : dnsDelta49 < 0 ? 'negative' : 'neutral')
    : undefined

  // 4.9: Configure Trusted DNS Servers - DNS servers configured (2 points)
  // Target: Delta ≥ 0 (DNS servers should stay same or increase)
  // Score formula: If Delta ≥ 0 or no previous data, award 2 points if count > 0
  //                If Delta < 0, award 0 points (decreased DNS servers is bad)
  const dnsScore = (metrics.dnsServersAvailable && metrics.dnsServersCount !== null && metrics.dnsServersCount > 0)
    ? (dnsDelta49 === undefined || dnsDelta49 >= 0 ? 2 : 0)
    : 0  // No points if data unavailable
  score += dnsScore

  details.push({
    id: '4.9',
    name: 'Configure Trusted DNS Servers on Enterprise Assets',
    ipFabricContext: 'DNS resolvers or caches configured',
    maxPoints: 2,
    currentValue: metrics.dnsServersAvailable && metrics.dnsServersCount !== null
      ? metrics.dnsServersCount
      : 'Data Unavailable',
    previousValue: prevMetrics?.dnsServersAvailable && prevMetrics?.dnsServersCount !== null
      ? prevMetrics.dnsServersCount!
      : undefined,
    delta: dnsDelta49,
    deltaDirection: dnsDeltaDirection49,
    calculatedPoints: dnsScore,
    scoringRule: '2 points if DNS servers configured (count > 0), else 0',
    unavailabilityReason: !metrics.dnsServersAvailable ? metrics.dnsServersReason : undefined
  })

  score = Math.round(score * 10) / 10

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

// Control 5: Account Management (Score: 0-10)
// Based on PDF: 5.1 Local AAA users (5pts), 5.4 AAA servers (5pts)
function calculateControl5Score(metrics: CISMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 10
  const details: CISControlDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // 5.1: Manage Default Accounts - Local AAA users (5 points)
  // Score formula: percentage × 5 (e.g., 52% = 2.6 points)
  const localUsersScore = (metrics.localAaaUsersAvailable && metrics.localAaaUsersPercent !== null)
    ? (metrics.localAaaUsersPercent / 100) * 5
    : 0  // No points if data unavailable
  score += localUsersScore

  // Calculate delta for 5.1 (only if both current and previous have data)
  const localUsersDelta = (
    metrics.localAaaUsersAvailable &&
    metrics.localAaaUsersPercent !== null &&
    prevMetrics?.localAaaUsersAvailable &&
    prevMetrics?.localAaaUsersPercent !== null
  ) ? Number((metrics.localAaaUsersPercent - prevMetrics.localAaaUsersPercent!).toFixed(1)) : undefined

  const localUsersDeltaDirection = localUsersDelta !== undefined
    ? (localUsersDelta > 0 ? 'positive' : localUsersDelta < 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '5.1',
    name: 'Manage Default Accounts on Enterprise Assets and Software',
    ipFabricContext: 'LOCAL user authentication accounts',
    maxPoints: 5,
    currentValue: metrics.localAaaUsersAvailable && metrics.localAaaUsersPercent !== null
      ? `${metrics.localAaaUsersPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.localAaaUsersAvailable && prevMetrics?.localAaaUsersPercent !== null
      ? `${prevMetrics.localAaaUsersPercent!.toFixed(1)}%`
      : undefined,
    delta: localUsersDelta !== undefined ? `${localUsersDelta > 0 ? '+' : ''}${localUsersDelta}%` : undefined,
    deltaDirection: localUsersDeltaDirection,
    calculatedPoints: Math.round(localUsersScore * 100) / 100,
    scoringRule: 'Percentage × 5 points (target: 100%)',
    unavailabilityReason: !metrics.localAaaUsersAvailable ? metrics.localAaaUsersReason : undefined
  })

  // Calculate delta for 5.4 (only if both current and previous have data)
  const aaaDelta = (
    metrics.aaaAvailable &&
    metrics.aaaPercent !== null &&
    prevMetrics?.aaaAvailable &&
    prevMetrics?.aaaPercent !== null
  ) ? Number((metrics.aaaPercent - prevMetrics.aaaPercent!).toFixed(1)) : undefined

  const aaaDeltaDirection = aaaDelta !== undefined
    ? (aaaDelta > 0 ? 'positive' : aaaDelta < 0 ? 'negative' : 'neutral')
    : undefined

  // 5.4: Restrict Administrator Privileges - AAA servers (5 points)
  // Target: Delta ≥ 0 (AAA adoption should stay same or increase)
  // Score formula: If Delta ≥ 0 or no previous data, calculate percentage × 5
  //                If Delta < 0, award 0 points (decreased AAA adoption is bad)
  const aaaServersScore = (metrics.aaaAvailable && metrics.aaaPercent !== null)
    ? (aaaDelta === undefined || aaaDelta >= 0
        ? (metrics.aaaPercent / 100) * 5
        : 0)  // Delta < 0 means decreased AAA adoption = 0 points
    : 0  // No points if data unavailable
  score += aaaServersScore

  details.push({
    id: '5.4',
    name: 'Restrict Administrator Privileges to Dedicated Administrator Accounts',
    ipFabricContext: 'TACACS and RADIUS servers configured on device (excl. cloud)',
    maxPoints: 5,
    currentValue: metrics.aaaAvailable && metrics.aaaPercent !== null
      ? `${metrics.aaaPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.aaaAvailable && prevMetrics?.aaaPercent !== null
      ? `${prevMetrics.aaaPercent!.toFixed(1)}%`
      : undefined,
    delta: aaaDelta !== undefined ? `${aaaDelta > 0 ? '+' : ''}${aaaDelta}%` : undefined,
    deltaDirection: aaaDeltaDirection,
    calculatedPoints: Math.round(aaaServersScore * 100) / 100,
    scoringRule: 'Percentage × 5 points (target: Delta ≥ 0)',
    unavailabilityReason: !metrics.aaaAvailable ? metrics.aaaReason : undefined
  })

  score = Math.round(score * 10) / 10

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

// Control 6: Access Control Management (Score: 0-10)
// Based on PDF: 6.6 & 6.7 combined - AAA servers for centralized access control (10pts)
function calculateControl6Score(metrics: CISMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 10
  const details: CISControlDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // Calculate delta for 6.6/6.7 (only if both current and previous have data)
  const aaaDelta = (
    metrics.aaaAvailable &&
    metrics.aaaPercent !== null &&
    prevMetrics?.aaaAvailable &&
    prevMetrics?.aaaPercent !== null
  ) ? Number((metrics.aaaPercent - prevMetrics.aaaPercent!).toFixed(1)) : undefined

  const aaaDeltaDirection = aaaDelta !== undefined
    ? (aaaDelta > 0 ? 'positive' : aaaDelta < 0 ? 'negative' : 'neutral')
    : undefined

  // 6.6 & 6.7: Establish and Maintain AAA Inventory + Centralize Access Control (10 points)
  // Both safeguards measure the same thing - AAA server configuration for centralized access
  // Target: Delta ≥ 0 (AAA adoption should stay same or increase)
  // Score formula: If Delta ≥ 0 or no previous data, calculate percentage × 10
  //                If Delta < 0, award 0 points (decreased AAA adoption is bad)
  const aaaScore = (metrics.aaaAvailable && metrics.aaaPercent !== null)
    ? (aaaDelta === undefined || aaaDelta >= 0
        ? (metrics.aaaPercent / 100) * 10
        : 0)  // Delta < 0 means decreased AAA adoption = 0 points
    : 0  // No points if data unavailable
  score += aaaScore

  details.push({
    id: '6.6/6.7',
    name: 'Establish and Maintain an Inventory of Authentication and Authorization Systems / Centralize Access Control',
    ipFabricContext: 'TACACS and RADIUS servers configured on device (excl. cloud)',
    maxPoints: 10,
    currentValue: metrics.aaaAvailable && metrics.aaaPercent !== null
      ? `${metrics.aaaPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.aaaAvailable && prevMetrics?.aaaPercent !== null
      ? `${prevMetrics.aaaPercent!.toFixed(1)}%`
      : undefined,
    delta: aaaDelta !== undefined ? `${aaaDelta > 0 ? '+' : ''}${aaaDelta}%` : undefined,
    deltaDirection: aaaDeltaDirection,
    calculatedPoints: Math.round(aaaScore * 100) / 100,
    scoringRule: 'Percentage × 10 points (target: Delta ≥ 0)',
    unavailabilityReason: !metrics.aaaAvailable ? metrics.aaaReason : undefined
  })

  score = Math.round(score * 10) / 10

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

// Control 8: Audit Log Management (Score: 0-10)
// Based on PDF: 8.2 Local logging (4pts) + Remote logging (4pts), 8.4 NTP (2pts)
function calculateControl8Score(metrics: CISMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 10
  const details: CISControlDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // 8.2: Collect Audit Logs - has two parts (8 points total)
  // Part 1: Local Logging (4 points)
  const localLoggingScore = (metrics.localLoggingAvailable && metrics.localLoggingPercent !== null)
    ? (metrics.localLoggingPercent / 100) * 4
    : 0  // No points if data unavailable
  // Part 2: Remote Logging (4 points)
  const remoteLoggingScore = (metrics.remoteLoggingAvailable && metrics.remoteLoggingPercent !== null)
    ? (metrics.remoteLoggingPercent / 100) * 4
    : 0  // No points if data unavailable
  const totalLoggingScore = localLoggingScore + remoteLoggingScore
  score += totalLoggingScore

  // Calculate deltas for 8.2 parts (only if both current and previous have data)
  const localLoggingDelta = (
    metrics.localLoggingAvailable &&
    metrics.localLoggingPercent !== null &&
    prevMetrics?.localLoggingAvailable &&
    prevMetrics?.localLoggingPercent !== null
  ) ? Number((metrics.localLoggingPercent - prevMetrics.localLoggingPercent!).toFixed(1)) : undefined
  const remoteLoggingDelta = (
    metrics.remoteLoggingAvailable &&
    metrics.remoteLoggingPercent !== null &&
    prevMetrics?.remoteLoggingAvailable &&
    prevMetrics?.remoteLoggingPercent !== null
  ) ? Number((metrics.remoteLoggingPercent - prevMetrics.remoteLoggingPercent!).toFixed(1)) : undefined

  // Build current/previous values
  const currentLocalValue = metrics.localLoggingAvailable && metrics.localLoggingPercent !== null
    ? `${metrics.localLoggingPercent.toFixed(1)}%`
    : 'N/A'
  const prevLocalValue = prevMetrics?.localLoggingAvailable && prevMetrics?.localLoggingPercent !== null
    ? `${prevMetrics.localLoggingPercent!.toFixed(1)}%`
    : undefined
  const currentRemoteValue = metrics.remoteLoggingAvailable && metrics.remoteLoggingPercent !== null
    ? `${metrics.remoteLoggingPercent.toFixed(1)}%`
    : 'N/A'
  const prevRemoteValue = prevMetrics?.remoteLoggingAvailable && prevMetrics?.remoteLoggingPercent !== null
    ? `${prevMetrics.remoteLoggingPercent!.toFixed(1)}%`
    : undefined

  details.push({
    id: '8.2',
    name: 'Collect Audit Logs',
    ipFabricContext: 'Local & Remote Logging',
    maxPoints: 8,
    currentValue: `Local: ${currentLocalValue}, Remote: ${currentRemoteValue}`,
    previousValue: (prevLocalValue || prevRemoteValue)
      ? `Local: ${prevLocalValue || 'N/A'}, Remote: ${prevRemoteValue || 'N/A'}`
      : undefined,
    calculatedPoints: Math.round(totalLoggingScore * 100) / 100,
    scoringRule: 'Local logging (4pts) + Remote logging (4pts) based on percentages',
    unavailabilityReason: (!metrics.localLoggingAvailable || !metrics.remoteLoggingAvailable)
      ? [
          !metrics.localLoggingAvailable ? `Local Logging: ${metrics.localLoggingReason}` : null,
          !metrics.remoteLoggingAvailable ? `Remote Logging: ${metrics.remoteLoggingReason}` : null
        ].filter(Boolean).join('; ')
      : undefined,
    breakdown: [
      {
        metric: 'Local Logging',
        value: metrics.localLoggingAvailable && metrics.localLoggingPercent !== null
          ? `${metrics.localLoggingPercent.toFixed(1)}%`
          : 'Data Unavailable',
        previousValue: prevLocalValue,
        delta: localLoggingDelta !== undefined
          ? `${localLoggingDelta > 0 ? '+' : ''}${localLoggingDelta}%`
          : undefined,
        points: Math.round(localLoggingScore * 100) / 100,
        rule: 'Percentage × 4 points (target: 100%)'
      },
      {
        metric: 'Remote Logging',
        value: metrics.remoteLoggingAvailable && metrics.remoteLoggingPercent !== null
          ? `${metrics.remoteLoggingPercent.toFixed(1)}%`
          : 'Data Unavailable',
        previousValue: prevRemoteValue,
        delta: remoteLoggingDelta !== undefined
          ? `${remoteLoggingDelta > 0 ? '+' : ''}${remoteLoggingDelta}%`
          : undefined,
        points: Math.round(remoteLoggingScore * 100) / 100,
        rule: 'Percentage × 4 points (target: 100%)'
      }
    ]
  })

  // 8.4: Standardize Time Synchronization - NTP configured (2 points)
  // Score formula: percentage × 2 (e.g., 65% = 1.3 points)
  const ntpScore = (metrics.ntpAvailable && metrics.ntpPercent !== null)
    ? (metrics.ntpPercent / 100) * 2
    : 0  // No points if data unavailable
  score += ntpScore

  // Calculate delta for 8.4 (only if both current and previous have data)
  const ntpDelta = (
    metrics.ntpAvailable &&
    metrics.ntpPercent !== null &&
    prevMetrics?.ntpAvailable &&
    prevMetrics?.ntpPercent !== null
  ) ? Number((metrics.ntpPercent - prevMetrics.ntpPercent!).toFixed(1)) : undefined

  const ntpDeltaDirection = ntpDelta !== undefined
    ? (ntpDelta > 0 ? 'positive' : ntpDelta < 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '8.4',
    name: 'Standardize Time Synchronization',
    ipFabricContext: 'NTP configured and synchronized',
    maxPoints: 2,
    currentValue: metrics.ntpAvailable && metrics.ntpPercent !== null
      ? `${metrics.ntpPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.ntpAvailable && prevMetrics?.ntpPercent !== null
      ? `${prevMetrics.ntpPercent!.toFixed(1)}%`
      : undefined,
    delta: ntpDelta !== undefined ? `${ntpDelta > 0 ? '+' : ''}${ntpDelta}%` : undefined,
    deltaDirection: ntpDeltaDirection,
    calculatedPoints: Math.round(ntpScore * 100) / 100,
    scoringRule: 'Percentage × 2 points (target: 100%)',
    unavailabilityReason: !metrics.ntpAvailable ? metrics.ntpReason : undefined
  })

  score = Math.round(score * 10) / 10

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

// Control 12: Network Infrastructure Management (Score: 0-10)
// Based on PDF: 12.1 EoS (2pts), 12.2 Zone FW (2pts), 12.3 Telnet (2pts), 12.4 Sites (2pts), 12.5 AAA (2pts)
function calculateControl12Score(metrics: CISMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 10
  const details: CISControlDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // 12.1: Ensure Network Infrastructure is Kept Up-to-Date - EoS devices (2 points)
  // Score formula: (100 - percentage) × 0.02 (reverse polarity - lower EoS is better)
  const eosPercentage = metrics.totalDevices > 0
    ? (metrics.endOfSupportDevices / metrics.totalDevices) * 100
    : 0
  const eosScore = ((100 - eosPercentage) / 100) * 2
  score += eosScore

  details.push({
    id: '12.1',
    name: 'Ensure Network Infrastructure is Kept Up-to-Date',
    ipFabricContext: 'Lifecycle Management (End of Support)',
    maxPoints: 2,
    currentValue: `${eosPercentage.toFixed(1)}%`,
    calculatedPoints: Math.round(eosScore * 100) / 100,
    scoringRule: '(100 - percentage) × 2 points (target: 0%)'
  })

  // Calculate delta for 12.2 (only if both current and previous have data)
  const zoneFwDelta = (
    metrics.zoneFirewallAvailable &&
    metrics.zoneFirewallCount !== null &&
    prevMetrics?.zoneFirewallAvailable &&
    prevMetrics?.zoneFirewallCount !== null
  ) ? metrics.zoneFirewallCount - prevMetrics.zoneFirewallCount! : undefined

  const zoneFwDeltaDirection = zoneFwDelta !== undefined
    ? (zoneFwDelta > 0 ? 'positive' : zoneFwDelta < 0 ? 'negative' : 'neutral')
    : undefined

  // 12.2: Establish and Maintain Secure Network Architecture - Zone FW policies (2 points)
  // Target: Delta ≥ 0 (zone firewall policies should stay same or increase)
  // Graduated scoring based on policy count thresholds:
  //   0 policies → 0 pts (no enforcement)
  //   1 policy → 0.5 pts (minimal enforcement)
  //   2-9 policies → 1 pt (basic enforcement)
  //   10+ policies AND Delta ≥ 0 → 2 pts (enterprise enforcement)
  //   10+ policies AND Delta < 0 → 0 pts (regression penalty)
  const count12 = metrics.zoneFirewallCount
  const zoneFwScore = (metrics.zoneFirewallAvailable && count12 !== null)
    ? (count12 === 0 ? 0
        : count12 === 1 ? 0.5
        : count12 < 10 ? 1
        : (zoneFwDelta === undefined || zoneFwDelta >= 0 ? 2 : 0))
    : 0  // No points if data unavailable
  score += zoneFwScore

  details.push({
    id: '12.2',
    name: 'Establish and Maintain a Secure Network Architecture',
    ipFabricContext: 'Zone Firewall Policies configured in the network',
    maxPoints: 2,
    currentValue: metrics.zoneFirewallAvailable && metrics.zoneFirewallCount !== null
      ? metrics.zoneFirewallCount
      : 'Data Unavailable',
    previousValue: prevMetrics?.zoneFirewallAvailable && prevMetrics?.zoneFirewallCount !== null
      ? prevMetrics.zoneFirewallCount!
      : undefined,
    delta: zoneFwDelta,
    deltaDirection: zoneFwDeltaDirection,
    calculatedPoints: Math.round(zoneFwScore * 100) / 100,
    scoringRule: 'Graduated: 0 policies=0pts, 1 policy=0.5pts, 2-9 policies=1pt, 10+ policies=2pts (if Delta≥0, else 0pts)',
    unavailabilityReason: !metrics.zoneFirewallAvailable ? metrics.zoneFirewallReason : undefined
  })

  // 12.3: Securely Manage Network Infrastructure - Telnet usage (2 points)
  // Score formula: (100 - percentage) × 0.02 (reverse polarity - lower telnet is better)
  const telnetScore12 = (metrics.telnetAvailable && metrics.telnetPercent !== null)
    ? ((100 - metrics.telnetPercent) / 100) * 2
    : 0  // No points if data unavailable
  score += telnetScore12

  // Calculate delta for 12.3 (only if both current and previous have data)
  const telnetDelta12 = (
    metrics.telnetAvailable &&
    metrics.telnetPercent !== null &&
    prevMetrics?.telnetAvailable &&
    prevMetrics?.telnetPercent !== null
  ) ? Number((metrics.telnetPercent - prevMetrics.telnetPercent!).toFixed(1)) : undefined

  const telnetDeltaDirection12 = telnetDelta12 !== undefined
    ? (telnetDelta12 < 0 ? 'positive' : telnetDelta12 > 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '12.3',
    name: 'Securely Manage Network Infrastructure',
    ipFabricContext: 'Clear text telnet protocol enabled',
    maxPoints: 2,
    currentValue: metrics.telnetAvailable && metrics.telnetPercent !== null
      ? `${metrics.telnetPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.telnetAvailable && prevMetrics?.telnetPercent !== null
      ? `${prevMetrics.telnetPercent!.toFixed(1)}%`
      : undefined,
    delta: telnetDelta12 !== undefined ? `${telnetDelta12 > 0 ? '+' : ''}${telnetDelta12}%` : undefined,
    deltaDirection: telnetDeltaDirection12,
    calculatedPoints: Math.round(telnetScore12 * 100) / 100,
    scoringRule: '(100 - percentage) × 2 points (target: 0%)',
    unavailabilityReason: !metrics.telnetAvailable ? metrics.telnetReason : undefined
  })

  // 12.4: Establish and Maintain Architecture Diagrams - Site count (2 points)
  // Score formula: Binary - count > 0 = 2 points, else 0
  const sitesScore = (metrics.siteCountAvailable && metrics.siteCount !== null && metrics.siteCount > 0)
    ? 2
    : 0  // No points if data unavailable
  score += sitesScore

  details.push({
    id: '12.4',
    name: 'Establish and Maintain Architecture Diagram(s)',
    ipFabricContext: 'Generates site diagrams and low level design documentation',
    maxPoints: 2,
    currentValue: metrics.siteCountAvailable && metrics.siteCount !== null
      ? metrics.siteCount
      : 'Data Unavailable',
    calculatedPoints: sitesScore,
    scoringRule: '2 points if sites tracked (count > 0), else 0',
    unavailabilityReason: !metrics.siteCountAvailable ? metrics.siteCountReason : undefined
  })

  // Calculate delta for 12.5 (only if both current and previous have data)
  const aaaDelta12 = (
    metrics.aaaAvailable &&
    metrics.aaaPercent !== null &&
    prevMetrics?.aaaAvailable &&
    prevMetrics?.aaaPercent !== null
  ) ? Number((metrics.aaaPercent - prevMetrics.aaaPercent!).toFixed(1)) : undefined

  const aaaDeltaDirection12 = aaaDelta12 !== undefined
    ? (aaaDelta12 > 0 ? 'positive' : aaaDelta12 < 0 ? 'negative' : 'neutral')
    : undefined

  // 12.5: Centralize Network AAA - AAA servers (2 points)
  // Target: Delta ≥ 0 (AAA adoption should stay same or increase)
  // Score formula: If Delta ≥ 0 or no previous data, calculate percentage × 2
  //                If Delta < 0, award 0 points (decreased AAA adoption is bad)
  const aaaScore12 = (metrics.aaaAvailable && metrics.aaaPercent !== null)
    ? (aaaDelta12 === undefined || aaaDelta12 >= 0
        ? (metrics.aaaPercent / 100) * 2
        : 0)  // Delta < 0 means decreased AAA adoption = 0 points
    : 0  // No points if data unavailable
  score += aaaScore12

  details.push({
    id: '12.5',
    name: 'Centralize Network Authentication, Authorization, and Auditing (AAA)',
    ipFabricContext: 'TACACS and RADIUS servers configured on device (excl. cloud)',
    maxPoints: 2,
    currentValue: metrics.aaaAvailable && metrics.aaaPercent !== null
      ? `${metrics.aaaPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.aaaAvailable && prevMetrics?.aaaPercent !== null
      ? `${prevMetrics.aaaPercent!.toFixed(1)}%`
      : undefined,
    delta: aaaDelta12 !== undefined ? `${aaaDelta12 > 0 ? '+' : ''}${aaaDelta12}%` : undefined,
    deltaDirection: aaaDeltaDirection12,
    calculatedPoints: Math.round(aaaScore12 * 100) / 100,
    scoringRule: 'Percentage × 2 points (target: Delta ≥ 0)',
    unavailabilityReason: !metrics.aaaAvailable ? metrics.aaaReason : undefined
  })

  score = Math.round(score * 10) / 10

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

// Control 13: Network Monitoring and Defence (Score: 0-10)
// Based on PDF: 13.4 Zone FW (2pts) + ACL ANY/ANY (2pts), 13.6 Flow collection (4pts), 13.9 802.1x (2pts)
function calculateControl13Score(metrics: CISMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 10
  const details: CISControlDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // Calculate deltas for 13.4 parts (only if both current and previous have data)
  const zoneFwDelta13 = (
    metrics.zoneFirewallAvailable &&
    metrics.zoneFirewallCount !== null &&
    prevMetrics?.zoneFirewallAvailable &&
    prevMetrics?.zoneFirewallCount !== null
  ) ? metrics.zoneFirewallCount - prevMetrics.zoneFirewallCount! : undefined
  const anyAnyDelta13 = (
    metrics.anyAnyAclAvailable &&
    metrics.anyAnyAclCount !== null &&
    prevMetrics?.anyAnyAclAvailable &&
    prevMetrics?.anyAnyAclCount !== null
  ) ? metrics.anyAnyAclCount - prevMetrics.anyAnyAclCount! : undefined

  // 13.4: Perform Traffic Filtering Between Network Segments (4 points - 2 parts)
  // Part 1: Zone Firewall Policies (2 points)
  // Target: Delta ≥ 0 (zone firewall policies should stay same or increase)
  // Graduated scoring: 0=0pts, 1=0.5pts, 2-9=1pt, 10+=2pts (if Delta≥0, else 0pts)
  const count13 = metrics.zoneFirewallCount
  const zoneFwScore13 = (metrics.zoneFirewallAvailable && count13 !== null)
    ? (count13 === 0 ? 0
        : count13 === 1 ? 0.5
        : count13 < 10 ? 1
        : (zoneFwDelta13 === undefined || zoneFwDelta13 >= 0 ? 2 : 0))
    : 0  // No points if data unavailable

  // Part 2: ACL ANY/ANY (2 points)
  // Target: Delta ≤ 0 (fewer ANY/ANY rules is better - reverse polarity)
  const anyAnyScore13 = (metrics.anyAnyAclAvailable && metrics.anyAnyAclCount !== null)
    ? (anyAnyDelta13 === undefined || anyAnyDelta13 <= 0
        ? (metrics.anyAnyAclCount >= 20 ? 0 : Math.max(0, (20 - metrics.anyAnyAclCount) / 10))
        : 0)  // Delta > 0 means more ANY/ANY rules = 0 points
    : 0  // No points if data unavailable
  const filtering134Score = zoneFwScore13 + anyAnyScore13
  score += filtering134Score

  const currentAnyAnyValue = metrics.anyAnyAclAvailable && metrics.anyAnyAclCount !== null
    ? metrics.anyAnyAclCount
    : 'N/A'
  const prevAnyAnyValue = prevMetrics?.anyAnyAclAvailable && prevMetrics?.anyAnyAclCount !== null
    ? prevMetrics.anyAnyAclCount!
    : undefined

  const currentZoneFwValue = metrics.zoneFirewallAvailable && metrics.zoneFirewallCount !== null
    ? metrics.zoneFirewallCount
    : 'N/A'
  const prevZoneFwValue = prevMetrics?.zoneFirewallAvailable && prevMetrics?.zoneFirewallCount !== null
    ? prevMetrics.zoneFirewallCount!
    : undefined

  details.push({
    id: '13.4',
    name: 'Perform Traffic Filtering Between Network Segments',
    ipFabricContext: 'Zone Firewall Policies & ACL ANY/ANY',
    maxPoints: 4,
    currentValue: `Zone FW: ${currentZoneFwValue}, ANY/ANY: ${currentAnyAnyValue}`,
    previousValue: (prevZoneFwValue !== undefined || prevAnyAnyValue !== undefined)
      ? `Zone FW: ${prevZoneFwValue || 'N/A'}, ANY/ANY: ${prevAnyAnyValue || 'N/A'}`
      : undefined,
    calculatedPoints: Math.round(filtering134Score * 100) / 100,
    scoringRule: 'Zone FW policies (2pts) + ACL ANY/ANY reverse scoring (2pts)',
    unavailabilityReason: (!metrics.zoneFirewallAvailable || !metrics.anyAnyAclAvailable)
      ? [
          !metrics.zoneFirewallAvailable ? `Zone FW: ${metrics.zoneFirewallReason}` : null,
          !metrics.anyAnyAclAvailable ? `ANY/ANY ACL: ${metrics.anyAnyAclReason}` : null
        ].filter(Boolean).join('; ')
      : undefined,
    breakdown: [
      {
        metric: 'Zone Firewall Policies',
        value: currentZoneFwValue,
        previousValue: prevZoneFwValue,
        delta: zoneFwDelta13,
        points: Math.round(zoneFwScore13 * 100) / 100,
        rule: 'Graduated: 0=0pts, 1=0.5pts, 2-9=1pt, 10+=2pts (if Delta≥0, else 0pts)'
      },
      {
        metric: 'ACL ANY/ANY Rules',
        value: currentAnyAnyValue,
        previousValue: prevAnyAnyValue,
        delta: anyAnyDelta13,
        points: Math.round(anyAnyScore13 * 100) / 100,
        rule: '(20 - count) / 10, max 2 points'
      }
    ]
  })

  // 13.6: Collect Network Traffic Flow Logs - NetFlow/sFlow (4 points)
  // Scoring based on delta: flows > 0 AND Delta >= 0 = 4pts, flows > 0 AND Delta < 0 = 2pts, else 0
  const flowDelta = (
    metrics.flowCollectionAvailable &&
    metrics.flowCollectionCount !== null &&
    prevMetrics?.flowCollectionAvailable &&
    prevMetrics?.flowCollectionCount !== null
  ) ? metrics.flowCollectionCount - prevMetrics.flowCollectionCount! : undefined

  let flowScore = 0
  if (metrics.flowCollectionAvailable && metrics.flowCollectionCount !== null && metrics.flowCollectionCount > 0) {
    if (flowDelta === undefined || flowDelta >= 0) {
      flowScore = 4  // Flows collected AND stable or growing
    } else {
      flowScore = 2  // Flows collected BUT declining
    }
  }  // No points if data unavailable
  score += flowScore

  const flowDeltaDirection = flowDelta !== undefined
    ? (flowDelta > 0 ? 'positive' : flowDelta < 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '13.6',
    name: 'Collect Network Traffic Flow Logs',
    ipFabricContext: 'NetFlow / IPFIX flow data exports configured',
    maxPoints: 4,
    currentValue: metrics.flowCollectionAvailable && metrics.flowCollectionCount !== null
      ? metrics.flowCollectionCount
      : 'Data Unavailable',
    previousValue: prevMetrics?.flowCollectionAvailable && prevMetrics?.flowCollectionCount !== null
      ? prevMetrics.flowCollectionCount!
      : undefined,
    delta: flowDelta,
    deltaDirection: flowDeltaDirection,
    calculatedPoints: flowScore,
    scoringRule: '4pts if flows > 0 AND Delta ≥ 0, 2pts if flows > 0 AND Delta < 0, else 0',
    unavailabilityReason: !metrics.flowCollectionAvailable ? metrics.flowCollectionReason : undefined
  })

  // 13.9: Deploy Port-Level Access Control - 802.1x (2 points)
  // Score formula: percentage × 2 (e.g., 40% = 0.8 points)
  const port8021xScore = (metrics.port8021xAvailable && metrics.port8021xPercent !== null)
    ? (metrics.port8021xPercent / 100) * 2
    : 0  // No points if data unavailable
  score += port8021xScore

  // Calculate delta for 13.9 (only if both current and previous have data)
  const port8021xDelta = (
    metrics.port8021xAvailable &&
    metrics.port8021xPercent !== null &&
    prevMetrics?.port8021xAvailable &&
    prevMetrics?.port8021xPercent !== null
  ) ? Number((metrics.port8021xPercent - prevMetrics.port8021xPercent!).toFixed(1)) : undefined

  const port8021xDeltaDirection = port8021xDelta !== undefined
    ? (port8021xDelta > 0 ? 'positive' : port8021xDelta < 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '13.9',
    name: 'Deploy Port-Level Access Control',
    ipFabricContext: 'All 802.1x enabled network (not user) devices in the network',
    maxPoints: 2,
    currentValue: metrics.port8021xAvailable && metrics.port8021xPercent !== null
      ? `${metrics.port8021xPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.port8021xAvailable && prevMetrics?.port8021xPercent !== null
      ? `${prevMetrics.port8021xPercent!.toFixed(1)}%`
      : undefined,
    delta: port8021xDelta !== undefined ? `${port8021xDelta > 0 ? '+' : ''}${port8021xDelta}%` : undefined,
    deltaDirection: port8021xDeltaDirection,
    calculatedPoints: Math.round(port8021xScore * 100) / 100,
    scoringRule: 'Percentage × 2 points (target: 100%)',
    unavailabilityReason: !metrics.port8021xAvailable ? metrics.port8021xReason : undefined
  })

  score = Math.round(score * 10) / 10

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

// Control 17: Incident Response Management (Score: 0-10)
// Based on PDF: 17.9 IPv4 Routes (4pts), Route Stability (2pts), ErrDisabled Interfaces (4pts)
function calculateControl17Score(metrics: CISMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 10
  const details: CISControlDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // 17.9 has 3 parts measuring security incident thresholds

  // Part 1: Number of IPv4 Routes (4 points - delta-based)
  // Score: If Delta >= 0 then 4 points, else 0 points
  const routesDelta = (
    metrics.routesAvailable &&
    metrics.routesCount !== null &&
    prevMetrics?.routesAvailable &&
    prevMetrics?.routesCount !== null
  ) ? metrics.routesCount - prevMetrics.routesCount! : undefined

  const routesScore = (metrics.routesAvailable && metrics.routesCount !== null)
    ? (routesDelta === undefined || routesDelta >= 0 ? 4 : 0)
    : 0  // No points if data unavailable
  score += routesScore

  const routesDeltaDirection = routesDelta !== undefined
    ? (routesDelta > 0 ? 'positive' : routesDelta < 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '17.9a',
    name: 'Establish and Maintain Security Incident Thresholds - IPv4 Routes',
    ipFabricContext: 'Number of IPv4 Routes',
    maxPoints: 4,
    currentValue: metrics.routesAvailable && metrics.routesCount !== null
      ? metrics.routesCount
      : 'Data Unavailable',
    previousValue: prevMetrics?.routesAvailable && prevMetrics?.routesCount !== null
      ? prevMetrics.routesCount!
      : undefined,
    delta: routesDelta,
    deltaDirection: routesDeltaDirection,
    calculatedPoints: routesScore,
    scoringRule: '4 points if Delta ≥ 0, else 0 points (target: Delta ≥ 0)',
    unavailabilityReason: !metrics.routesAvailable ? metrics.routesReason : undefined
  })

  // Part 2: IPv4 Route Stability (2 points)
  // Score: If 0 unstable routes = 2 points, else 0 points
  const routeStabilityScore = (metrics.unstableRoutesAvailable && metrics.unstableRoutesCount !== null && metrics.unstableRoutesCount === 0)
    ? 2
    : 0  // No points if data unavailable or routes unstable
  score += routeStabilityScore

  const unstableRoutesDelta = (
    metrics.unstableRoutesAvailable &&
    metrics.unstableRoutesCount !== null &&
    prevMetrics?.unstableRoutesAvailable &&
    prevMetrics?.unstableRoutesCount !== null
  ) ? metrics.unstableRoutesCount - prevMetrics.unstableRoutesCount! : undefined

  const unstableRoutesDeltaDirection = unstableRoutesDelta !== undefined
    ? (unstableRoutesDelta < 0 ? 'positive' : unstableRoutesDelta > 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '17.9b',
    name: 'Establish and Maintain Security Incident Thresholds - Route Stability',
    ipFabricContext: 'IPv4 Route Stability (recently converged routes)',
    maxPoints: 2,
    currentValue: metrics.unstableRoutesAvailable && metrics.unstableRoutesCount !== null
      ? metrics.unstableRoutesCount
      : 'Data Unavailable',
    previousValue: prevMetrics?.unstableRoutesAvailable && prevMetrics?.unstableRoutesCount !== null
      ? prevMetrics.unstableRoutesCount!
      : undefined,
    delta: unstableRoutesDelta,
    deltaDirection: unstableRoutesDeltaDirection,
    calculatedPoints: routeStabilityScore,
    scoringRule: '2 points if 0 unstable routes, else 0 (target: 0)',
    unavailabilityReason: !metrics.unstableRoutesAvailable ? metrics.unstableRoutesReason : undefined
  })

  // Part 3: Interfaces ErrDisabled (4 points)
  // Score formula: (100 - percentage) × 0.04 (reverse polarity - lower is better)
  const errDisabledScore = (metrics.errDisabledAvailable && metrics.errDisabledPercent !== null)
    ? ((100 - metrics.errDisabledPercent) / 100) * 4
    : 0  // No points if data unavailable
  score += errDisabledScore

  const errDisabledDelta = (
    metrics.errDisabledAvailable &&
    metrics.errDisabledPercent !== null &&
    prevMetrics?.errDisabledAvailable &&
    prevMetrics?.errDisabledPercent !== null
  ) ? Number((metrics.errDisabledPercent - prevMetrics.errDisabledPercent!).toFixed(1)) : undefined

  const errDisabledDeltaDirection = errDisabledDelta !== undefined
    ? (errDisabledDelta < 0 ? 'positive' : errDisabledDelta > 0 ? 'negative' : 'neutral')
    : undefined

  details.push({
    id: '17.9c',
    name: 'Establish and Maintain Security Incident Thresholds - ErrDisabled Interfaces',
    ipFabricContext: 'Interfaces in error-disabled state',
    maxPoints: 4,
    currentValue: metrics.errDisabledAvailable && metrics.errDisabledPercent !== null
      ? `${metrics.errDisabledPercent.toFixed(1)}%`
      : 'Data Unavailable',
    previousValue: prevMetrics?.errDisabledAvailable && prevMetrics?.errDisabledPercent !== null
      ? `${prevMetrics.errDisabledPercent!.toFixed(1)}%`
      : undefined,
    delta: errDisabledDelta !== undefined ? `${errDisabledDelta > 0 ? '+' : ''}${errDisabledDelta}%` : undefined,
    deltaDirection: errDisabledDeltaDirection,
    calculatedPoints: Math.round(errDisabledScore * 100) / 100,
    scoringRule: '(100 - percentage) × 4 points (target: 0%)',
    unavailabilityReason: !metrics.errDisabledAvailable ? metrics.errDisabledReason : undefined
  })

  score = Math.round(score * 10) / 10

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

// Control 18: Penetration Testing (Score: 0-10)
// Based on PDF: 18.4 Zone Firewall Policies (5pts) + ANY/ANY ACL (5pts)
function calculateControl18Score(metrics: CISMetrics, devices: Device[]) {
  let score = 0
  const maxScore = 10
  const details: CISControlDetail[] = []
  const prevMetrics = metrics.previousMetrics

  // 18.4 Validate Security Measures - Part 1: Zone Firewall Policies (5 points)
  // Target: Delta ≥ 0 (zone firewall policies should stay same or increase)
  // Graduated scoring (scaled to 5 points): 0=0pts, 1=1.25pts, 2-9=2.5pts, 10+=5pts (if Delta≥0, else 0pts)
  const zoneFirewallDelta = (
    metrics.zoneFirewallAvailable &&
    metrics.zoneFirewallCount !== null &&
    prevMetrics?.zoneFirewallAvailable &&
    prevMetrics?.zoneFirewallCount !== null
  ) ? metrics.zoneFirewallCount - prevMetrics.zoneFirewallCount! : undefined

  const count18 = metrics.zoneFirewallCount
  const zoneFirewallScore = (metrics.zoneFirewallAvailable && count18 !== null)
    ? (count18 === 0 ? 0
        : count18 === 1 ? 1.25
        : count18 < 10 ? 2.5
        : (zoneFirewallDelta === undefined || zoneFirewallDelta >= 0 ? 5 : 0))
    : 0  // No points if data unavailable
  score += zoneFirewallScore

  const zoneFirewallDeltaDirection = zoneFirewallDelta !== undefined
    ? (zoneFirewallDelta > 0 ? 'positive' : zoneFirewallDelta < 0 ? 'negative' : 'neutral')
    : undefined

  const anyAnyDelta = (
    metrics.anyAnyAclAvailable &&
    metrics.anyAnyAclCount !== null &&
    prevMetrics?.anyAnyAclAvailable &&
    prevMetrics?.anyAnyAclCount !== null
  ) ? metrics.anyAnyAclCount - prevMetrics.anyAnyAclCount! : undefined

  const anyAnyDeltaDirection = anyAnyDelta !== undefined
    ? (anyAnyDelta < 0 ? 'positive' : anyAnyDelta > 0 ? 'negative' : 'neutral')
    : undefined

  // 18.4 Validate Security Measures - Part 2: ANY/ANY ACL Policies (5 points)
  // Target: Delta ≤ 0 (fewer ANY/ANY rules is better - reverse polarity)
  // Score formula: If Delta ≤ 0 or no previous data, calculate: max 5 if 0, otherwise (20 - value) / 4
  //                If Delta > 0, award 0 points (increased ANY/ANY rules is bad)
  const anyAnyScore = (metrics.anyAnyAclAvailable && metrics.anyAnyAclCount !== null)
    ? (anyAnyDelta === undefined || anyAnyDelta <= 0
        ? (metrics.anyAnyAclCount === 0
            ? 5
            : metrics.anyAnyAclCount >= 20
            ? 0
            : (20 - metrics.anyAnyAclCount) / 4)
        : 0)  // Delta > 0 means more ANY/ANY rules = 0 points
    : 0  // No points if data unavailable
  score += anyAnyScore

  const currentZoneFw18 = metrics.zoneFirewallAvailable && metrics.zoneFirewallCount !== null
    ? metrics.zoneFirewallCount
    : 'N/A'
  const prevZoneFw18 = prevMetrics?.zoneFirewallAvailable && prevMetrics?.zoneFirewallCount !== null
    ? prevMetrics.zoneFirewallCount!
    : undefined
  const currentAnyAnyValue18 = metrics.anyAnyAclAvailable && metrics.anyAnyAclCount !== null
    ? metrics.anyAnyAclCount
    : 'N/A'
  const prevAnyAnyValue18 = prevMetrics?.anyAnyAclAvailable && prevMetrics?.anyAnyAclCount !== null
    ? prevMetrics.anyAnyAclCount!
    : undefined

  details.push({
    id: '18.4',
    name: 'Validate Security Measures',
    ipFabricContext: 'Zone Firewall Policies & ACL policies that permit ANY/ANY',
    maxPoints: 10,
    currentValue: `Zone FW: ${currentZoneFw18} policies, ANY/ANY ACL: ${currentAnyAnyValue18} rules`,
    previousValue: (prevZoneFw18 !== undefined || prevAnyAnyValue18 !== undefined)
      ? `Zone FW: ${prevZoneFw18 || 'N/A'} policies, ANY/ANY ACL: ${prevAnyAnyValue18 || 'N/A'} rules`
      : undefined,
    calculatedPoints: Math.round(score * 100) / 100,
    scoringRule: 'Zone FW: Graduated (0=0pts, 1=1.25pts, 2-9=2.5pts, 10+=5pts if Delta≥0, else 0pts). ANY/ANY ACL: 5pts if 0, else (20-value)/4 if Delta≤0',
    unavailabilityReason: (!metrics.zoneFirewallAvailable || !metrics.anyAnyAclAvailable)
      ? [
          !metrics.zoneFirewallAvailable ? `Zone FW: ${metrics.zoneFirewallReason}` : null,
          !metrics.anyAnyAclAvailable ? `ANY/ANY ACL: ${metrics.anyAnyAclReason}` : null
        ].filter(Boolean).join('; ')
      : undefined,
    breakdown: [
      {
        metric: 'Zone Firewall Policies',
        value: currentZoneFw18,
        points: Math.round(zoneFirewallScore * 100) / 100,
        rule: 'Graduated: 0=0pts, 1=1.25pts, 2-9=2.5pts, 10+=5pts (if Delta≥0, else 0pts)',
        previousValue: prevZoneFw18,
        delta: zoneFirewallDelta !== undefined ? `${zoneFirewallDelta > 0 ? '+' : ''}${zoneFirewallDelta}` : undefined
      },
      {
        metric: 'ANY/ANY ACL Rules',
        value: currentAnyAnyValue18,
        points: Math.round(anyAnyScore * 100) / 100,
        rule: '5 pts if 0, else (20-value)/4',
        previousValue: prevAnyAnyValue18,
        delta: anyAnyDelta !== undefined ? `${anyAnyDelta > 0 ? '+' : ''}${anyAnyDelta}` : undefined
      }
    ]
  })

  score = Math.round(score * 10) / 10

  return {
    score: Math.min(maxScore, score),
    maxScore,
    status: getStatus(score, maxScore),
    details
  }
}

function getStatus(score: number, maxScore: number): 'pass' | 'warning' | 'fail' {
  const percentage = (score / maxScore) * 100
  if (percentage >= 80) return 'pass'
  if (percentage >= 60) return 'warning'
  return 'fail'
}

// Progressive loading version - fetches and loads controls in batches to avoid rate limiting
// Calls onBatchComplete after each batch with partial results
export async function calculateCISControlsProgressive(
  devices: Device[],
  snapshotId: string,
  intentChecksPassed: number,
  intentChecksFailed: number,
  apiCall?: (endpoint: string, options?: any) => Promise<any>,
  previousSnapshotId?: string | null,
  previousDevices?: Device[],
  onBatchComplete?: (batchNumber: number, controls: CISControl[], totalBatches: number) => void
): Promise<CISControl[]> {
  if (!apiCall) {
    // Fallback to regular calculation if no API
    return calculateCISControls(devices, snapshotId, intentChecksPassed, intentChecksFailed, apiCall, previousSnapshotId, previousDevices)
  }

  const allControls: CISControl[] = []
  const totalBatches = 4
  const totalDevices = devices.length

  // Accumulated metrics across batches
  let accumulatedMetrics: Partial<CISMetrics> = {
    totalDevices,
    discoveryIssues: 0,
    uniquePlatforms: 0,
    versionVariance: 1,
    endOfSupportDevices: 0,
    siteCount: 0,
    intentChecksPassed,
    intentChecksFailed,
    anyAnyAclCount: 0,
    dnsCoveragePercent: 0,
    telnetPercent: 0,
    remoteLoggingPercent: 0,
    aaaPercent: 0,
    localAaaUsersPercent: 0,
    dnsServersCount: 0,
    localLoggingPercent: 0,
    ntpPercent: 0,
    zoneFirewallCount: 0,
    flowCollectionCount: 0,
    port8021xPercent: 0,
    routesCount: 0,
    unstableRoutesCount: 0,
    errDisabledPercent: 0
  }

  // Fetch previous metrics if comparison is enabled
  if (previousSnapshotId) {
    const prevMetrics = await fetchPreviousMetrics(previousSnapshotId, previousDevices || devices, apiCall)
    accumulatedMetrics.previousMetrics = prevMetrics
  }

  // Batch 1: Foundation Controls (1, 2, 3)
  const batch1Metrics = await fetchBatch1Metrics(snapshotId, devices, intentChecksPassed, intentChecksFailed, apiCall)
  accumulatedMetrics = {...accumulatedMetrics, ...batch1Metrics}

  const control1 = { id: '1', name: 'Inventory and Control of Enterprise Assets', loading: false, ...calculateControl1Score(accumulatedMetrics as CISMetrics, devices) }
  const control2 = { id: '2', name: 'Inventory and Control of Software Assets', loading: false, ...calculateControl2Score(accumulatedMetrics as CISMetrics, devices) }
  const control3 = { id: '3', name: 'Data Protection', loading: false, ...calculateControl3Score(accumulatedMetrics as CISMetrics, devices) }
  allControls.push(control1, control2, control3)

  if (onBatchComplete) onBatchComplete(1, allControls, totalBatches)
  await delay(500)

  // Batch 2: Configuration & Access Controls (4, 5, 6)
  const batch2Metrics = await fetchBatch2Metrics(snapshotId, totalDevices, apiCall)
  accumulatedMetrics = {...accumulatedMetrics, ...batch2Metrics}

  const control4 = { id: '4', name: 'Secure Configuration of Enterprise Assets and Software', loading: false, ...calculateControl4Score(accumulatedMetrics as CISMetrics, devices) }
  const control5 = { id: '5', name: 'Account Management', loading: false, ...calculateControl5Score(accumulatedMetrics as CISMetrics, devices) }
  const control6 = { id: '6', name: 'Access Control Management', loading: false, ...calculateControl6Score(accumulatedMetrics as CISMetrics, devices) }
  allControls.push(control4, control5, control6)

  if (onBatchComplete) onBatchComplete(2, allControls, totalBatches)
  await delay(500)

  // Batch 3: Logging & Infrastructure Controls (8, 12)
  const batch3Metrics = await fetchBatch3Metrics(snapshotId, totalDevices, apiCall)
  accumulatedMetrics = {...accumulatedMetrics, ...batch3Metrics}

  const control8 = { id: '8', name: 'Audit Log Management', loading: false, ...calculateControl8Score(accumulatedMetrics as CISMetrics, devices) }
  const control12 = { id: '12', name: 'Network Infrastructure Management', loading: false, ...calculateControl12Score(accumulatedMetrics as CISMetrics, devices) }
  allControls.push(control8, control12)

  if (onBatchComplete) onBatchComplete(3, allControls, totalBatches)
  await delay(500)

  // Batch 4: Monitoring, Response & Testing Controls (13, 17, 18)
  const batch4Metrics = await fetchBatch4Metrics(snapshotId, apiCall)
  accumulatedMetrics = {...accumulatedMetrics, ...batch4Metrics}

  const control13 = { id: '13', name: 'Network Monitoring and Defence', loading: false, ...calculateControl13Score(accumulatedMetrics as CISMetrics, devices) }
  const control17 = { id: '17', name: 'Incident Response Management', loading: false, ...calculateControl17Score(accumulatedMetrics as CISMetrics, devices) }
  const control18 = { id: '18', name: 'Penetration Testing', loading: false, ...calculateControl18Score(accumulatedMetrics as CISMetrics, devices) }
  allControls.push(control13, control17, control18)

  if (onBatchComplete) onBatchComplete(4, allControls, totalBatches)

  return allControls
}

// Helper function to fetch all previous snapshot metrics at once
async function fetchPreviousMetrics(
  previousSnapshotId: string,
  previousDevices: Device[],
  apiCall: (endpoint: string, options?: any) => Promise<any>
): Promise<CISMetrics['previousMetrics']> {
  const prevTotalDevices = previousDevices.length

  // Fetch all previous metrics with 1000ms delays to avoid rate limiting

  // Control 1 previous metrics
  const prevSiteCountResult = await fetchSiteCount(previousSnapshotId, apiCall)
  await delay(1000)
  const prevPlatformTypesResult = await fetchPlatformTypes(previousSnapshotId, apiCall)
  await delay(1000)

  // Control 3 previous metrics
  const prevAnyAnyAclResult = await fetchAnyAnyAclCount(previousSnapshotId, apiCall)
  await delay(1000)
  const prevDnsCoverageResult = await fetchDnsCoverage(previousSnapshotId, prevTotalDevices, apiCall)
  await delay(1000)
  const prevTelnetResult = await fetchTelnetPercentage(previousSnapshotId, prevTotalDevices, apiCall)
  await delay(1000)
  const prevRemoteLoggingResult = await fetchRemoteLoggingPercentage(previousSnapshotId, prevTotalDevices, apiCall)
  await delay(1000)
  const prevAaaResult = await fetchAaaPercentage(previousSnapshotId, prevTotalDevices, apiCall)
  await delay(1000)

  // Control 4 previous metrics
  const prevLocalAaaUsersResult = await fetchLocalAaaUsersPercentage(previousSnapshotId, prevTotalDevices, apiCall)
  await delay(1000)
  const prevDnsServersResult = await fetchDnsServersCount(previousSnapshotId, apiCall)
  await delay(1000)

  // Control 8 previous metrics
  const prevLocalLoggingResult = await fetchLocalLoggingPercentage(previousSnapshotId, prevTotalDevices, apiCall)
  await delay(1000)
  const prevNtpResult = await fetchNtpPercentage(previousSnapshotId, prevTotalDevices, apiCall)
  await delay(1000)

  // Control 13 previous metrics
  const prevZoneFirewallResult = await fetchZoneFirewallCount(previousSnapshotId, apiCall)
  await delay(1000)
  const prevFlowCollectionResult = await fetchFlowCollectionCount(previousSnapshotId, apiCall)
  await delay(1000)
  const prev8021xResult = await fetch8021xPercentage(previousSnapshotId, apiCall)
  await delay(1000)

  // Control 17 previous metrics
  const prevRoutesResult = await fetchRoutesCount(previousSnapshotId, apiCall)
  await delay(1000)
  const prevUnstableRoutesResult = await fetchUnstableRoutesCount(previousSnapshotId, apiCall)
  await delay(1000)
  const prevErrDisabledResult = await fetchErrDisabledPercentage(previousSnapshotId, apiCall)

  // Control 3.8 Extended - Path Lookups
  await delay(1000)
  const prevPathLookupInfo = await fetchPathLookupAvailability(previousSnapshotId, apiCall)

  return {
    // Control 1 previous metrics
    siteCount: prevSiteCountResult.value,
    siteCountAvailable: prevSiteCountResult.available,
    uniquePlatforms: prevPlatformTypesResult.value,
    uniquePlatformsAvailable: prevPlatformTypesResult.available,

    // Control 3 previous metrics
    anyAnyAclCount: prevAnyAnyAclResult.value,
    anyAnyAclAvailable: prevAnyAnyAclResult.available,
    dnsCoveragePercent: prevDnsCoverageResult.value,
    dnsCoverageAvailable: prevDnsCoverageResult.available,
    telnetPercent: prevTelnetResult.value,
    telnetAvailable: prevTelnetResult.available,
    remoteLoggingPercent: prevRemoteLoggingResult.value,
    remoteLoggingAvailable: prevRemoteLoggingResult.available,
    aaaPercent: prevAaaResult.value,
    aaaAvailable: prevAaaResult.available,

    // Control 4 previous metrics
    localAaaUsersPercent: prevLocalAaaUsersResult.value,
    localAaaUsersAvailable: prevLocalAaaUsersResult.available,
    dnsServersCount: prevDnsServersResult.value,
    dnsServersAvailable: prevDnsServersResult.available,

    // Control 8 previous metrics
    localLoggingPercent: prevLocalLoggingResult.value,
    localLoggingAvailable: prevLocalLoggingResult.available,
    ntpPercent: prevNtpResult.value,
    ntpAvailable: prevNtpResult.available,

    // Control 13 previous metrics
    zoneFirewallCount: prevZoneFirewallResult.value,
    zoneFirewallAvailable: prevZoneFirewallResult.available,
    flowCollectionCount: prevFlowCollectionResult.value,
    flowCollectionAvailable: prevFlowCollectionResult.available,
    port8021xPercent: prev8021xResult.value,
    port8021xAvailable: prev8021xResult.available,

    // Control 17 previous metrics
    routesCount: prevRoutesResult.value,
    routesAvailable: prevRoutesResult.available,
    unstableRoutesCount: prevUnstableRoutesResult.value,
    unstableRoutesAvailable: prevUnstableRoutesResult.available,
    errDisabledPercent: prevErrDisabledResult.value,
    errDisabledAvailable: prevErrDisabledResult.available,
    pathLookupAvailable: prevPathLookupInfo.available,
    pathLookupCheckCount: prevPathLookupInfo.checkCount
  }
}

// Calculate overall CIS compliance score (0-100%)
// For Controls 1, 2, 3, 4, 5, 6, 8, 12, 13, 17, and 18: maximum 110 points total
// (10 + 10 + 10 + 10 + 10 + 10 + 10 + 10 + 10 + 10 + 10)
// Note: Control 3 includes optional 3.8 Extended (2pts) that may not be available in all environments
export function calculateOverallCISScore(controls: CISControl[]): number {
  const totalScore = controls.reduce((sum, c) => sum + c.score, 0)
  const maxScore = controls.reduce((sum, c) => sum + c.maxScore, 0)
  const percentage = Math.round((totalScore / maxScore) * 1000) / 10 // Round to 1 decimal

  return percentage
}

/**
 * Extract numeric value from detail currentValue (handles numbers, strings, percentages)
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
 * Extract complete CISMetrics object from already-loaded controls
 * This allows score recalculation WITHOUT refetching metrics from API
 *
 * @param controls - Loaded CIS controls with detail data
 * @param totalDevices - Total device count
 * @param intentChecksPassed - Intent checks passed count
 * @param intentChecksFailed - Intent checks failed count
 * @returns Complete CISMetrics object extracted from controls
 */
export function extractMetricsFromControls(
  controls: CISControl[],
  totalDevices: number,
  intentChecksPassed: number,
  intentChecksFailed: number
): CISMetrics {
  const metrics: Partial<CISMetrics> = {
    totalDevices,
    intentChecksPassed,
    intentChecksFailed,
    // Defaults
    discoveryIssues: 0,
    versionVariance: 1,
    endOfSupportDevices: 0,
    // Initialize all availability flags to false (will be set to true if extracted successfully)
    siteCountAvailable: false,
    uniquePlatformsAvailable: false,
    anyAnyAclAvailable: false,
    dnsCoverageAvailable: false,
    telnetAvailable: false,
    remoteLoggingAvailable: false,
    aaaAvailable: false,
    localAaaUsersAvailable: false,
    dnsServersAvailable: false,
    localLoggingAvailable: false,
    ntpAvailable: false,
    zoneFirewallAvailable: false,
    flowCollectionAvailable: false,
    port8021xAvailable: false,
    routesAvailable: false,
    unstableRoutesAvailable: false,
    errDisabledAvailable: false,
    pathLookupAvailable: false
  }

  // Extract from each control's details
  controls.forEach(control => {
    control.details?.forEach(detail => {
      const value = extractNumericValue(detail.currentValue)
      const isAvailable = detail.unavailabilityReason === undefined

      // Map detail IDs to metric fields
      switch (detail.id) {
        // Control 1
        case '1.1':
          // Detail has breakdown items for Device Count and Site Count
          if (detail.breakdown) {
            detail.breakdown.forEach(item => {
              if (item.metric.includes('Site Count')) {
                const extractedValue = extractNumericValue(item.value)
                metrics.siteCount = extractedValue
                metrics.siteCountAvailable = extractedValue !== null &&
                  !String(item.value || '').includes('Data Unavailable')
                if (!metrics.siteCountAvailable) {
                  metrics.siteCountReason = 'Site count data not available'
                }
              }
              // Device Count comes from totalDevices parameter, not breakdown
            })
          }
          break
        case '1.2':
          metrics.discoveryIssues = value || 0
          break
        case '1.3':
          // Intent checks from parameters
          break

        // Control 2
        case '2.1/2.4':
          // Detail has breakdown items for Platform Types and Version Variance
          if (detail.breakdown) {
            detail.breakdown.forEach(item => {
              if (item.metric.includes('Unique Platform')) {
                const extractedValue = extractNumericValue(item.value)
                metrics.uniquePlatforms = extractedValue
                metrics.uniquePlatformsAvailable = extractedValue !== null &&
                  !String(item.value || '').includes('Data Unavailable')
                if (!metrics.uniquePlatformsAvailable) {
                  metrics.uniquePlatformsReason = 'Platform types data not available'
                }
              } else if (item.metric.includes('Version Variance')) {
                const extractedValue = extractNumericValue(item.value)
                metrics.versionVariance = extractedValue || 1  // Default to 1 if null
              }
            })
          }
          break
        case '2.2':
          // EoS - extract from currentValue (format: "X devices (Y%)")
          metrics.endOfSupportDevices = value || 0
          break

        // Control 3
        case '3.3':
          metrics.anyAnyAclCount = value
          metrics.anyAnyAclAvailable = isAvailable
          metrics.anyAnyAclReason = detail.unavailabilityReason
          break
        case '3.8':
          metrics.dnsCoveragePercent = value
          metrics.dnsCoverageAvailable = isAvailable
          metrics.dnsCoverageReason = detail.unavailabilityReason
          break
        case '3.10':
          metrics.telnetPercent = value
          metrics.telnetAvailable = isAvailable
          metrics.telnetReason = detail.unavailabilityReason
          break
        case '3.8-extended':
          // Path lookup feature - currentValue is "Available" or "Not Available" string
          metrics.pathLookupAvailable = String(detail.currentValue || '').includes('Available') &&
            !String(detail.currentValue || '').includes('Not Available') &&
            !String(detail.currentValue || '').includes('Data Unavailable')
          if (detail.currentValue && typeof detail.currentValue === 'string') {
            const checkCountMatch = detail.currentValue.match(/(\d+)\s+checks?/)
            if (checkCountMatch) {
              metrics.pathLookupCheckCount = parseInt(checkCountMatch[1])
            }
          }
          if (!metrics.pathLookupAvailable) {
            metrics.pathLookupUnavailableReason = detail.unavailabilityReason || 'Path lookup feature not available'
          }
          break
        case '3.14':
          // Composite - has breakdown items
          if (detail.breakdown) {
            detail.breakdown.forEach(item => {
              if (item.metric.includes('Remote Logging')) {
                const extractedValue = extractNumericValue(item.value)
                metrics.remoteLoggingPercent = extractedValue
                metrics.remoteLoggingAvailable = extractedValue !== null &&
                  !String(item.value || '').includes('Data Unavailable')
                if (!metrics.remoteLoggingAvailable) {
                  metrics.remoteLoggingReason = 'Remote logging data not available'
                }
              } else if (item.metric.includes('AAA')) {
                const extractedValue = extractNumericValue(item.value)
                metrics.aaaPercent = extractedValue
                metrics.aaaAvailable = extractedValue !== null &&
                  !String(item.value || '').includes('Data Unavailable')
                if (!metrics.aaaAvailable) {
                  metrics.aaaReason = 'AAA configuration data not available'
                }
              }
            })
          }
          break

        // Control 4
        case '4.6':
          // Telnet (duplicate of 3.10, already extracted)
          break
        case '4.7':
          metrics.localAaaUsersPercent = value
          metrics.localAaaUsersAvailable = isAvailable
          metrics.localAaaUsersReason = detail.unavailabilityReason
          break
        case '4.9':
          metrics.dnsServersCount = value
          metrics.dnsServersAvailable = isAvailable
          metrics.dnsServersReason = detail.unavailabilityReason
          break

        // Control 5
        case '5.1':
          // Local AAA users (duplicate of 4.7, already extracted)
          break
        case '5.4':
          // AAA percent (duplicate of 3.14, already extracted)
          break

        // Control 6
        case '6.6':
        case '6.7':
          // AAA percent (duplicate, already extracted)
          break

        // Control 8
        case '8.2':
          // Composite - has breakdown items
          if (detail.breakdown) {
            detail.breakdown.forEach(item => {
              if (item.metric.includes('Local Logging')) {
                const extractedValue = extractNumericValue(item.value)
                metrics.localLoggingPercent = extractedValue
                metrics.localLoggingAvailable = extractedValue !== null &&
                  !String(item.value || '').includes('Data Unavailable')
                if (!metrics.localLoggingAvailable) {
                  metrics.localLoggingReason = 'Local logging data not available'
                }
              } else if (item.metric.includes('Remote Logging')) {
                // Already extracted from 3.14
              }
            })
          }
          break
        case '8.4':
          metrics.ntpPercent = value
          metrics.ntpAvailable = isAvailable
          metrics.ntpReason = detail.unavailabilityReason
          break

        // Control 12
        case '12.1':
          // EoS (duplicate of 2.2, already extracted)
          break
        case '12.2':
          metrics.zoneFirewallCount = value
          metrics.zoneFirewallAvailable = isAvailable
          metrics.zoneFirewallReason = detail.unavailabilityReason
          break
        case '12.3':
          // Telnet (duplicate, already extracted)
          break
        case '12.4':
          // Site count (duplicate, already extracted)
          break
        case '12.5':
          // AAA percent (duplicate, already extracted)
          break

        // Control 13
        case '13.4':
          // Composite - zone FW already extracted from 12.2
          // ANY/ANY already extracted from 3.3
          break
        case '13.6':
          metrics.flowCollectionCount = value
          metrics.flowCollectionAvailable = isAvailable
          metrics.flowCollectionReason = detail.unavailabilityReason
          break
        case '13.9':
          metrics.port8021xPercent = value
          metrics.port8021xAvailable = isAvailable
          metrics.port8021xReason = detail.unavailabilityReason
          break

        // Control 17 - Three separate details (not composite)
        case '17.9a':
          // IPv4 Routes count
          metrics.routesCount = value
          metrics.routesAvailable = isAvailable
          metrics.routesReason = detail.unavailabilityReason
          break
        case '17.9b':
          // Route Stability (unstable routes count)
          metrics.unstableRoutesCount = value
          metrics.unstableRoutesAvailable = isAvailable
          metrics.unstableRoutesReason = detail.unavailabilityReason
          break
        case '17.9c':
          // ErrDisabled Interfaces percentage
          metrics.errDisabledPercent = value
          metrics.errDisabledAvailable = isAvailable
          metrics.errDisabledReason = detail.unavailabilityReason
          break

        // Control 18
        case '18.4':
          // Composite - zone FW and ANY/ANY already extracted
          break
      }
    })
  })

  return metrics as CISMetrics
}

/**
 * Recalculate all control scores using extracted metrics (no API calls)
 * This enables delta-based scoring without refetching data
 *
 * @param currentMetrics - Metrics extracted from current controls
 * @param previousMetrics - Metrics extracted from previous controls
 * @param devices - Current snapshot devices
 * @returns All controls with recalculated scores based on delta context
 */
export function recalculateControlsWithMetrics(
  currentMetrics: CISMetrics,
  previousMetrics: CISMetrics,
  devices: Device[]
): CISControl[] {
  // Build combined metrics with previousMetrics for delta calculation
  const metricsWithComparison: CISMetrics = {
    ...currentMetrics,
    previousMetrics: {
      siteCount: previousMetrics.siteCount,
      siteCountAvailable: previousMetrics.siteCountAvailable,
      uniquePlatforms: previousMetrics.uniquePlatforms,
      uniquePlatformsAvailable: previousMetrics.uniquePlatformsAvailable,
      anyAnyAclCount: previousMetrics.anyAnyAclCount,
      anyAnyAclAvailable: previousMetrics.anyAnyAclAvailable,
      dnsCoveragePercent: previousMetrics.dnsCoveragePercent,
      dnsCoverageAvailable: previousMetrics.dnsCoverageAvailable,
      telnetPercent: previousMetrics.telnetPercent,
      telnetAvailable: previousMetrics.telnetAvailable,
      remoteLoggingPercent: previousMetrics.remoteLoggingPercent,
      remoteLoggingAvailable: previousMetrics.remoteLoggingAvailable,
      aaaPercent: previousMetrics.aaaPercent,
      aaaAvailable: previousMetrics.aaaAvailable,
      localAaaUsersPercent: previousMetrics.localAaaUsersPercent,
      localAaaUsersAvailable: previousMetrics.localAaaUsersAvailable,
      dnsServersCount: previousMetrics.dnsServersCount,
      dnsServersAvailable: previousMetrics.dnsServersAvailable,
      localLoggingPercent: previousMetrics.localLoggingPercent,
      localLoggingAvailable: previousMetrics.localLoggingAvailable,
      ntpPercent: previousMetrics.ntpPercent,
      ntpAvailable: previousMetrics.ntpAvailable,
      zoneFirewallCount: previousMetrics.zoneFirewallCount,
      zoneFirewallAvailable: previousMetrics.zoneFirewallAvailable,
      flowCollectionCount: previousMetrics.flowCollectionCount,
      flowCollectionAvailable: previousMetrics.flowCollectionAvailable,
      port8021xPercent: previousMetrics.port8021xPercent,
      port8021xAvailable: previousMetrics.port8021xAvailable,
      routesCount: previousMetrics.routesCount,
      routesAvailable: previousMetrics.routesAvailable,
      unstableRoutesCount: previousMetrics.unstableRoutesCount,
      unstableRoutesAvailable: previousMetrics.unstableRoutesAvailable,
      errDisabledPercent: previousMetrics.errDisabledPercent,
      errDisabledAvailable: previousMetrics.errDisabledAvailable
    }
  }

  // Recalculate all controls with delta context
  const control1 = { id: '1', name: 'Inventory and Control of Enterprise Assets', ...calculateControl1Score(metricsWithComparison, devices) }
  const control2 = { id: '2', name: 'Inventory and Control of Software Assets', ...calculateControl2Score(metricsWithComparison, devices) }
  const control3 = { id: '3', name: 'Data Protection', ...calculateControl3Score(metricsWithComparison, devices) }
  const control4 = { id: '4', name: 'Secure Configuration of Enterprise Assets and Software', ...calculateControl4Score(metricsWithComparison, devices) }
  const control5 = { id: '5', name: 'Account Management', ...calculateControl5Score(metricsWithComparison, devices) }
  const control6 = { id: '6', name: 'Access Control Management', ...calculateControl6Score(metricsWithComparison, devices) }
  const control8 = { id: '8', name: 'Audit Log Management', ...calculateControl8Score(metricsWithComparison, devices) }
  const control12 = { id: '12', name: 'Network Infrastructure Management', ...calculateControl12Score(metricsWithComparison, devices) }
  const control13 = { id: '13', name: 'Network Monitoring and Defence', ...calculateControl13Score(metricsWithComparison, devices) }
  const control17 = { id: '17', name: 'Incident Response Management', ...calculateControl17Score(metricsWithComparison, devices) }
  const control18 = { id: '18', name: 'Penetration Testing', ...calculateControl18Score(metricsWithComparison, devices) }

  return [
    control1,
    control2,
    control3,
    control4,
    control5,
    control6,
    control8,
    control12,
    control13,
    control17,
    control18
  ]
}

/**
 * Enrich current controls with delta fields by comparing with previous controls
 * This is a pure client-side computation - NO API calls
 *
 * @param currentControls - Current snapshot controls (without delta fields)
 * @param previousControls - Previous snapshot controls
 * @returns Current controls enriched with previousValue, delta, deltaDirection fields
 */
export function enrichControlsWithDeltas(
  currentControls: CISControl[],
  previousControls: CISControl[]
): CISControl[] {
  return currentControls.map(currentControl => {
    // Find matching previous control by ID
    const previousControl = previousControls.find(pc => pc.id === currentControl.id)

    if (!previousControl) {
      // No previous control found - return current as-is
      return currentControl
    }

    // Enrich details with delta fields
    const enrichedDetails = currentControl.details?.map(currentDetail => {
      // Find matching previous detail by ID
      const previousDetail = previousControl.details?.find(pd => pd.id === currentDetail.id)

      if (!previousDetail) {
        // No previous detail found - return current as-is
        return currentDetail
      }

      // Extract numeric values for delta calculation
      const getCurrentNumericValue = (val: any): number | null => {
        if (typeof val === 'number') return val
        if (typeof val === 'string') {
          const numeric = parseFloat(val.replace(/[^0-9.-]/g, ''))
          return isNaN(numeric) ? null : numeric
        }
        return null
      }

      const currentNumeric = getCurrentNumericValue(currentDetail.currentValue)
      const previousNumeric = getCurrentNumericValue(previousDetail.currentValue)

      // Compute delta
      let delta: number | string | undefined = undefined
      let deltaDirection: 'positive' | 'negative' | 'neutral' | undefined = undefined

      if (currentNumeric !== null && previousNumeric !== null) {
        const numericDelta = currentNumeric - previousNumeric

        // Format delta to match currentValue format
        if (typeof currentDetail.currentValue === 'string' && currentDetail.currentValue.includes('%')) {
          delta = numericDelta.toFixed(1) + '%'
        } else {
          delta = numericDelta
        }

        // Determine direction with reverse polarity detection
        const isReversePolarity =
          currentDetail.name?.toLowerCase().includes('error') ||
          currentDetail.name?.toLowerCase().includes('telnet') ||
          currentDetail.name?.toLowerCase().includes('any/any') ||
          currentDetail.name?.toLowerCase().includes('errdisabled') ||
          currentDetail.ipFabricContext?.toLowerCase().includes('telnet') ||
          currentDetail.ipFabricContext?.toLowerCase().includes('any/any')

        if (numericDelta > 0) {
          deltaDirection = isReversePolarity ? 'negative' : 'positive'
        } else if (numericDelta < 0) {
          deltaDirection = isReversePolarity ? 'positive' : 'negative'
        } else {
          deltaDirection = 'neutral'
        }
      }

      // Return detail enriched with delta fields only (scores not recalculated here)
      return {
        ...currentDetail,
        previousValue: previousDetail.currentValue,
        delta,
        deltaDirection
      }
    })

    // Return control with enriched details (scores unchanged)
    return {
      ...currentControl,
      details: enrichedDetails
    }
  })
}