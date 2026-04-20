// IP Fabric Metrics API Service - Fetches real metrics data from IP Fabric
// NO SIMULATED DATA - All data comes from actual IP Fabric API

import type { DataSourceAvailability } from '@/types/data-availability'
import type {
  APICallFunction,
  APIResponse,
  Device,
  DiscoveryTask,
  DiscoveryIssue,
  Site,
  IntentCheckReport,
  IntentCheckStatus
} from '@/types/ipfabric-api'
import { parseIntentCheckStatus } from './device-api'

// Simple cache to prevent redundant API calls
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const metricsCache = new Map<string, CacheEntry<unknown>>()
const CACHE_TTL = 30000 // 30 seconds cache TTL


export interface DiscoveryErrors {
  count: number
  errors: Array<DiscoveryTask | DiscoveryIssue>
}

export interface VersionConsistency {
  vendor: string
  model: string
  variance: number
}

export interface EndOfSupportSummary {
  totalDevices: number
  endOfSupportDevices: number
  percentage: number
}

export interface IntentChecksMetrics {
  totalChecks: number
  passed: number
  failed: number
  hasChecks: boolean
}

// MetricResult - Standard return type for metric fetch functions
// Enforces strict data availability handling (CLAUDE.MD compliant)
export type MetricResult<T> = {
  value: T | null
  available: boolean
  reason?: string
  truncated?: boolean
  notApplicable?: boolean  // Feature not applicable to this environment (e.g., wired-only network)
}


// Fetch discovery errors from IP Fabric
export async function fetchDiscoveryErrors(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<{ data: DiscoveryErrors | null; availability: DataSourceAvailability }> {
  // Check cache
  const cacheKey = `discovery-errors-${snapshotId}`
  const cached = metricsCache.get(cacheKey) as CacheEntry<{ data: DiscoveryErrors | null; availability: DataSourceAvailability }> | undefined
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    // Use discovery-errors as primary endpoint (discovery-tasks returns 404 in v7.3+)
    const response = await apiCall('tables/reports/discovery-errors', {
      method: 'POST',
      body: {
        columns: ['loginIp', 'errorText', 'errorType', 'dnsName'],
        snapshot: snapshotId,
        pagination: { limit: 1000, start: 0 }
      }
    })

    // Check if endpoint returned an error
    if (response && response._error) {
      console.warn(`[fetchDiscoveryErrors] Discovery errors endpoint not available (${response._error.status})`)

      const emptyResult = {
        data: { count: 0, errors: [] },
        availability: {
          available: false,
          endpoint: 'tables/reports/discovery-errors',
          impact: 'Discovery errors defaulting to 0 - actual network issues may not be detected',
          fallbackUsed: true,
          fallbackValue: 0
        }
      }
      metricsCache.set(cacheKey, { data: emptyResult, timestamp: Date.now() })
      return emptyResult
    }

    if (response && response._meta) {
      const errorCount = response._meta.size || 0
      const dataArray = Array.isArray(response.data) ? response.data : []

      const result = {
        data: {
          count: errorCount,
          errors: dataArray as Array<DiscoveryTask | DiscoveryIssue>
        },
        availability: {
          available: true,
          endpoint: 'tables/reports/discovery-errors',
          impact: 'Discovery errors successfully fetched',
          fallbackUsed: false
        }
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    // If no _meta, try counting data directly
    if (response && response.data && Array.isArray(response.data)) {
      const errorCount = response.data.length
      const result = {
        data: {
          count: errorCount,
          errors: response.data as Array<DiscoveryTask | DiscoveryIssue>
        },
        availability: {
          available: true,
          endpoint: 'tables/reports/discovery-errors',
          impact: 'Discovery errors successfully fetched',
          fallbackUsed: false
        }
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }


    const emptyResult = {
      data: { count: 0, errors: [] },
      availability: {
        available: false,
        endpoint: 'tables/inventory/discovery-tasks',
        impact: 'Discovery errors unavailable - network issues may not be detected',
        fallbackUsed: true,
        fallbackValue: 0
      }
    }
    metricsCache.set(cacheKey, { data: emptyResult, timestamp: Date.now() })
    return emptyResult
  } catch (error) {
    console.error('[fetchDiscoveryErrors] Failed, returning 0:', error)
    // Return 0 errors if endpoint doesn't exist
    return {
      data: { count: 0, errors: [] },
      availability: {
        available: false,
        endpoint: 'tables/inventory/discovery-tasks',
        impact: 'Discovery errors API failed - cannot detect network issues',
        fallbackUsed: true,
        fallbackValue: 0
      }
    }
  }
}

// Fetch OS version consistency to calculate variance
export async function fetchVersionVariance(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<VersionConsistency | null> {
  // Check cache
  const cacheKey = `version-variance-${snapshotId}`
  const cached = metricsCache.get(cacheKey) as CacheEntry<VersionConsistency | null> | undefined
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    // Get devices to calculate version variance
    const response = await apiCall('tables/inventory/devices', {
      method: 'POST',
      body: {
        columns: ['vendor', 'model', 'version'],
        snapshot: snapshotId,
        pagination: {
          limit: 1000,
          start: 0
        }
      }
    })

    // Check if endpoint returned an error (404/410)
    if (response && response._error) {
      console.warn(`[fetchVersionVariance] Devices endpoint not available (${response._error.status}), returning null`)
      return null
    }

    if (response && response.data) {
      const devices = response.data as Device[]

      // Group by vendor (not vendor/model) for more accurate variance
      // IP Fabric likely calculates variance at vendor level
      const vendorVersions: Record<string, Set<string>> = {}
      const vendorPlatforms: Record<string, Set<string>> = {}

      devices.forEach((device: Device) => {
        if (!device.vendor || !device.version) return

        if (!vendorVersions[device.vendor]) {
          vendorVersions[device.vendor] = new Set()
          vendorPlatforms[device.vendor] = new Set()
        }
        vendorVersions[device.vendor].add(device.version)
        if (device.model) {
          vendorPlatforms[device.vendor].add(device.model)
        }
      })

      // Calculate weighted average variance (more accurate than just max)
      let totalDevices = devices.length
      let weightedVariance = 0
      let maxVariance = 0
      let maxVendor = ''
      let maxModel = ''

      Object.entries(vendorVersions).forEach(([vendor, versions]) => {
        const vendorDeviceCount = devices.filter((d: Device) => d.vendor === vendor).length
        const variance = versions.size
        const weight = vendorDeviceCount / totalDevices
        weightedVariance += variance * weight

        // Also track max for fallback
        if (variance > maxVariance) {
          maxVariance = variance
          maxVendor = vendor
          // Get most common model for this vendor
          const models: Record<string, number> = {}
          devices
            .filter((d: Device) => d.vendor === vendor)
            .forEach((d: Device) => {
              if (d.model) models[d.model] = (models[d.model] || 0) + 1
            })
          maxModel = Object.entries(models)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'
        }
      })

      // Use weighted average rounded up (more representative)
      const finalVariance = Math.ceil(weightedVariance)

      const result = {
        vendor: maxVendor,
        model: maxModel,
        variance: finalVariance  // Use calculated weighted average
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    return null
  } catch (error) {
    console.error('[fetchVersionVariance] Failed:', error)
    return null
  }
}

// Fetch End of Support summary
export async function fetchEndOfSupportSummary(
  snapshotId: string,
  totalDevices: number,
  apiCall: APICallFunction
): Promise<EndOfSupportSummary | null> {
  try {
    // Use the correct EoL summary endpoint
    const eosResponse = await apiCall('tables/reports/eof/summary', {
      method: 'POST',
      body: {
        columns: ['endSupport', 'pidCount', 'vendor', 'pid'],
        snapshot: snapshotId,
        pagination: {
          limit: 1000,
          start: 0
        }
      }
    })

    // Check if we got EoL data
    if (eosResponse && !eosResponse._error && eosResponse.data && Array.isArray(eosResponse.data)) {
      const todayTimestamp = Date.now()

      // Filter for parts that are End of Support (endSupport date in past or today)
      // Sum the pidCount for devices affected
      const eosDeviceCount = eosResponse.data
        .filter((item: any) => {
          const endSupport = item.endSupport
          // endSupport is a timestamp (milliseconds) - 0 means no EoS data
          return endSupport && endSupport !== 0 && endSupport <= todayTimestamp
        })
        .reduce((sum: number, item: any) => sum + (item.pidCount || 0), 0)

      const percentage = totalDevices > 0 ? (eosDeviceCount / totalDevices) * 100 : 0

      return {
        totalDevices,
        endOfSupportDevices: eosDeviceCount,
        percentage: Math.round(percentage * 100) / 100
      }
    }

    // If no data available, return null (NO HARDCODED FALLBACK)
    console.warn('[fetchEndOfSupportSummary] EoL summary endpoint returned no data')
    return null
  } catch (error) {
    console.error('[fetchEndOfSupportSummary] Failed:', error)
    return null
  }
}

// Fetch site count from IP Fabric
export async function fetchSiteCount(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/inventory/sites', {
      method: 'POST',
      body: {
        columns: ['siteName'],
        snapshot: snapshotId,
        pagination: {
          limit: 1000,
          start: 0
        }
      }
    })

    // Check for pagination truncation
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data) {
      // Count unique sites
      const sites = response.data as Site[]
      const uniqueSites = new Set(sites.map((item: Site) => item.siteName))
      return {
        value: uniqueSites.size,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'Sites endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchSiteCount] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `Sites endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch platform types count
export async function fetchPlatformTypes(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    // Use the correct platforms summary endpoint
    const response = await apiCall('tables/inventory/summary/platforms', {
      method: 'POST',
      body: {
        columns: ['vendor', 'family', 'platform', 'devicesCount'],
        snapshot: snapshotId,
        pagination: {
          limit: 1000,
          start: 0
        }
      }
    })

    // Check for pagination truncation
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response._meta) {
      // Count is the number of unique platform entries
      return {
        value: response._meta.size || 0,
        available: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      // Count the number of unique platform rows
      return {
        value: response.data.length,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'Platform types endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchPlatformTypes] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `Platform types endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch ANY/ANY ACL count for Control 3.3
export async function fetchAnyAnyAclCount(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    // Use the detailed ACL table (not global-policies)
    const response = await apiCall('tables/security/acl', {
      method: 'POST',
      body: {
        columns: ['ipSrc', 'ipDst', 'action', 'hostname'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      // Filter for ANY/ANY patterns
      // ipSrc and ipDst are ARRAYS of strings
      const anyAnyPolicies = response.data.filter((policy: any) => {
        const srcArray = policy.ipSrc || []
        const dstArray = policy.ipDst || []

        // Check if source contains ANY patterns
        const srcHasAny = srcArray.some((ip: string) =>
          /^(any|0\.0\.0\.0|0\.0\.0\.0\/0|::|::\/0)$/i.test(ip)
        )

        // Check if destination contains ANY patterns
        const dstHasAny = dstArray.some((ip: string) =>
          /^(any|0\.0\.0\.0|0\.0\.0\.0\/0|::|::\/0)$/i.test(ip)
        )

        return srcHasAny && dstHasAny
      })

      return {
        value: anyAnyPolicies.length,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'ACL endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchAnyAnyAclCount] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `ACL endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch DNS coverage for Control 3.8
export async function fetchDnsCoverage(
  snapshotId: string,
  totalDevices: number,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/addressing/managed-devs', {
      method: 'POST',
      body: {
        columns: ['hostname', 'ip', 'dnsName', 'dnsHostnameMatch', 'dnsReverseMatch'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      const totalIps = response.data.length

      // Count IPs with BOTH forward and reverse DNS (both values = 1)
      const ipsWithBothDns = response.data.filter(
        (entry: any) => entry.dnsHostnameMatch === 1 && entry.dnsReverseMatch === 1
      ).length

      const percentage = totalIps > 0 ? (ipsWithBothDns / totalIps) * 100 : 0
      return {
        value: Math.round(percentage * 100) / 100,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'Managed devices endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchDnsCoverage] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `Managed devices endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch telnet usage percentage for Control 3.10
export async function fetchTelnetPercentage(
  snapshotId: string,
  totalDevices: number,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/security/enabled-telnet', {
      method: 'POST',
      body: {
        columns: ['hostname', 'loginType', 'siteName'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response._meta) {
      const telnetDevices = response._meta.size || 0
      const percentage = totalDevices > 0 ? (telnetDevices / totalDevices) * 100 : 0
      return {
        value: Math.round(percentage * 100) / 100,
        available: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      const telnetDevices = response.data.length
      const percentage = totalDevices > 0 ? (telnetDevices / totalDevices) * 100 : 0
      return {
        value: Math.round(percentage * 100) / 100,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'Telnet endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchTelnetPercentage] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `Telnet endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch remote logging percentage for Control 3.14
export async function fetchRemoteLoggingPercentage(
  snapshotId: string,
  totalDevices: number,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/management/logging/remote', {
      method: 'POST',
      body: {
        columns: ['hostname', 'host', 'protocol'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      // Count unique hostnames with remote logging configured (must have logging host)
      const hostnamesWithLogging = new Set(
        response.data
          .filter((entry: any) => entry.host && entry.host.trim() !== '')
          .map((entry: any) => entry.hostname)
          .filter(Boolean)
      )
      const percentage = totalDevices > 0 ? (hostnamesWithLogging.size / totalDevices) * 100 : 0
      return {
        value: Math.round(percentage * 100) / 100,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'Remote logging endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchRemoteLoggingPercentage] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `Remote logging endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch AAA configuration percentage for Control 3.14
export async function fetchAaaPercentage(
  snapshotId: string,
  totalDevices: number,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/security/aaa/servers', {
      method: 'POST',
      body: {
        columns: ['hostname', 'type', 'protocol'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      // Count unique hostnames with AAA configured (must have valid AAA server type, exclude cloud devices)
      const hostnamesWithAaa = new Set(
        response.data
          .filter((entry: any) => {
            const hasValidServer = entry.type && entry.type.trim() !== ''
            const isNotCloud = entry.hostname && !/(AWS|Azure|GCP|cloud)/i.test(entry.hostname)
            return hasValidServer && isNotCloud
          })
          .map((entry: any) => entry.hostname)
          .filter(Boolean)
      )
      const percentage = totalDevices > 0 ? (hostnamesWithAaa.size / totalDevices) * 100 : 0
      return {
        value: Math.round(percentage * 100) / 100,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'AAA servers endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchAaaPercentage] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `AAA servers endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Check for configured intent checks - using reports endpoint
// Returns REPORT-level counts (not individual check counts) for meaningful metrics
export async function fetchIntentChecksMetrics(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<IntentChecksMetrics | null> {
  try {
    // IP Fabric uses GET /reports endpoint for intent verification checks
    const response = await apiCall(`reports?snapshot=${snapshotId}`, {
      method: 'GET',
      skipSnapshot: true  // Already in URL
    })

    // Check if endpoint returned an error
    if (response && response._error) {
      console.warn(`[fetchIntentChecksMetrics] Reports endpoint not available (${response._error.status})`)
      return {
        totalChecks: 0,
        passed: 0,
        failed: 0,
        hasChecks: false
      }
    }

    // Response should be an array of report objects
    if (Array.isArray(response)) {
      // Count REPORTS by their overall status (not individual checks)
      let reportsWithFailures = 0
      let reportsWithWarnings = 0
      let reportsFullyPassed = 0

      const reports = response as IntentCheckReport[]
      reports.forEach((report: IntentCheckReport) => {
        if (report.result && report.result.checks) {
          const checks = report.result.checks

          const failedInReport = (checks['20'] || 0) + (checks['30'] || 0)
          const warningsInReport = checks['10'] || 0
          const passedInReport = checks['0'] || 0

          // Count this report based on its worst status
          if (failedInReport > 0) {
            reportsWithFailures++
          } else if (warningsInReport > 0) {
            reportsWithWarnings++
          } else if (passedInReport > 0 || report.result.count > 0) {
            reportsFullyPassed++
          }
        }
      })

      const totalReports = reportsWithFailures + reportsWithWarnings + reportsFullyPassed

      return {
        totalChecks: totalReports,
        passed: reportsFullyPassed,
        failed: reportsWithFailures,
        hasChecks: totalReports > 0
      }
    }

    // No data available
    console.warn('[fetchIntentChecksMetrics] Reports endpoint returned unexpected format')
    return {
      totalChecks: 0,
      passed: 0,
      failed: 0,
      hasChecks: false
    }
  } catch (error) {
    console.error('[fetchIntentChecksMetrics] Failed:', error)
    return null
  }
}

// Fetch local AAA users percentage for Control 4.7
export async function fetchLocalAaaUsersPercentage(
  snapshotId: string,
  totalDevices: number,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/security/aaa/users', {
      method: 'POST',
      body: {
        columns: ['hostname', 'username', 'privilege', 'groups'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      // Count unique hostnames with local AAA user accounts configured (must have valid username)
      const hostnamesWithLocalUsers = new Set(
        response.data
          .filter((entry: any) => entry.username && entry.username.trim() !== '')
          .map((entry: any) => entry.hostname)
          .filter(Boolean)
      )
      const percentage = totalDevices > 0 ? (hostnamesWithLocalUsers.size / totalDevices) * 100 : 0
      return {
        value: Math.round(percentage * 100) / 100,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'AAA users endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchLocalAaaUsersPercentage] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `AAA users endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch DNS servers count for Control 4.9
export async function fetchDnsServersCount(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/management/dns/servers', {
      method: 'POST',
      body: {
        columns: ['hostname', 'ip', 'type', 'vrf'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response._meta) {
      return {
        value: response._meta.size || 0,
        available: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      return {
        value: response.data.length,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'DNS servers endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchDnsServersCount] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `DNS servers endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch local logging percentage for Control 8.2 (Part 1)
export async function fetchLocalLoggingPercentage(
  snapshotId: string,
  totalDevices: number,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/management/logging/local', {
      method: 'POST',
      body: {
        columns: ['hostname', 'fileName', 'type'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      // Count unique hostnames with local logging configured (disk, monitor, or memory)
      const hostnamesWithLocalLogging = new Set(
        response.data.map((entry: any) => entry.hostname).filter(Boolean)
      )
      const percentage = totalDevices > 0 ? (hostnamesWithLocalLogging.size / totalDevices) * 100 : 0
      return {
        value: Math.round(percentage * 100) / 100,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'Local logging endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchLocalLoggingPercentage] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `Local logging endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch NTP percentage for Control 8.4
export async function fetchNtpPercentage(
  snapshotId: string,
  totalDevices: number,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/management/ntp/summary', {
      method: 'POST',
      body: {
        columns: ['hostname', 'confSources', 'synchronizedSources'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      // Count unique hostnames with NTP configured AND actively synchronized
      // Not just configured (confSources) but also actively syncing (synchronizedSources)
      const hostnamesWithNtp = new Set(
        response.data
          .filter((entry: any) =>
            entry.confSources && entry.confSources > 0 &&
            entry.synchronizedSources && entry.synchronizedSources > 0
          )
          .map((entry: any) => entry.hostname)
          .filter(Boolean)
      )
      const percentage = totalDevices > 0 ? (hostnamesWithNtp.size / totalDevices) * 100 : 0
      return {
        value: Math.round(percentage * 100) / 100,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'NTP endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchNtpPercentage] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `NTP endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch zone firewall policies count for Control 12.2
export async function fetchZoneFirewallCount(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/security/zone-firewall/policies', {
      method: 'POST',
      body: {
        columns: ['hostname', 'action', 'active'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response._meta) {
      return {
        value: response._meta.size || 0,
        available: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      return {
        value: response.data.length,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'Zone firewall endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchZoneFirewallCount] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `Zone firewall endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch flow collection count for Control 13.6
export async function fetchFlowCollectionCount(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/management/flow/overview', {
      method: 'POST',
      body: {
        columns: ['hostname', 'countNetflowCollectors', 'countSflowCollectors'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      // Count devices where flow collection is configured (NetFlow OR sFlow)
      const devicesWithFlowCollection = response.data.filter(
        (entry: any) => (entry.countNetflowCollectors > 0) || (entry.countSflowCollectors > 0)
      ).length
      return {
        value: devicesWithFlowCollection,
        available: true
      }
    }

    if (response && response._meta) {
      return {
        value: response._meta.size || 0,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'Flow collection endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchFlowCollectionCount] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `Flow collection endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch 802.1x percentage for Control 13.9
export async function fetch8021xPercentage(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/security/secure-ports/devices', {
      method: 'POST',
      body: {
        columns: ['hostname', 'intSecEdgeCount', 'intTotalEdgeCount'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      // Filter out cloud devices (AWS/GCP/Azure)
      const nonCloudDevices = response.data.filter(
        (entry: any) => entry.hostname && !/(AWS|Azure|GCP|cloud)/i.test(entry.hostname)
      )

      // Calculate total secure ports vs total edge ports
      const totalSecureEdgePorts = nonCloudDevices.reduce((sum: number, entry: any) =>
        sum + (entry.intSecEdgeCount || 0), 0
      )
      const totalEdgePorts = nonCloudDevices.reduce((sum: number, entry: any) =>
        sum + (entry.intTotalEdgeCount || 0), 0
      )

      const percentage = totalEdgePorts > 0 ? (totalSecureEdgePorts / totalEdgePorts) * 100 : 0
      return {
        value: Math.round(percentage * 100) / 100,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: '802.1x secure ports endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetch8021xPercentage] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `802.1x endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch IPv4 routes count for Control 17.9 (Part 1)
export async function fetchRoutesCount(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/networks/routes', {
      method: 'POST',
      body: {
        columns: ['hostname', 'network', 'protocol'],
        snapshot: snapshotId,
        pagination: { limit: 10000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response._meta) {
      return {
        value: response._meta.size || 0,
        available: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      return {
        value: response.data.length,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'Routes endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchRoutesCount] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `Routes endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch IPv6 routes count for NIST RC.RP-05
export async function fetchIPv6RoutesCount(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  const cacheKey = `ipv6-routes-${snapshotId}`
  const cached = metricsCache.get(cacheKey) as CacheEntry<MetricResult<number>> | undefined
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const response = await apiCall('tables/networks/ipv6-routes', {
      method: 'POST',
      body: {
        columns: ['hostname', 'network', 'protocol'],
        snapshot: snapshotId,
        pagination: { limit: 10000, start: 0 }
      }
    })

    // Check for API error
    if (response && response._error) {
      const result: MetricResult<number> = {
        value: null,
        available: false,
        reason: `IPv6 routes endpoint not available (${response._error.status})`
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    // Check for pagination truncation
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      const result: MetricResult<number> = {
        value: null,
        available: false,
        reason: 'IPv6 routes data truncated - pagination limit exceeded',
        truncated: true
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    if (response && response._meta) {
      const result: MetricResult<number> = {
        value: response._meta.size || 0,
        available: true
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    const result: MetricResult<number> = {
      value: null,
      available: false,
      reason: 'IPv6 routes endpoint returned no data'
    }
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch (error) {
    const result: MetricResult<number> = {
      value: null,
      available: false,
      reason: `IPv6 routes endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }
}

// Fetch config consistency count for NIST RC.RP-05
// Counts devices with unsaved configuration changes
export async function fetchConfigConsistencyCount(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  const cacheKey = `config-saved-${snapshotId}`
  const cached = metricsCache.get(cacheKey) as CacheEntry<MetricResult<number>> | undefined
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const response = await apiCall('tables/management/configuration/saved', {
      method: 'POST',
      body: {
        columns: ['hostname'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for API error
    if (response && response._error) {
      const result: MetricResult<number> = {
        value: null,
        available: false,
        reason: `Config consistency endpoint not available (${response._error.status})`
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    // Check for pagination truncation
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      const result: MetricResult<number> = {
        value: null,
        available: false,
        reason: 'Config consistency data truncated - pagination limit exceeded',
        truncated: true
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    if (response && response._meta) {
      // Count = devices with unsaved config changes
      const result: MetricResult<number> = {
        value: response._meta.size || 0,
        available: true
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    const result: MetricResult<number> = {
      value: null,
      available: false,
      reason: 'Config consistency endpoint returned no data'
    }
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch (error) {
    const result: MetricResult<number> = {
      value: null,
      available: false,
      reason: `Config consistency endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }
}

// Fetch unstable routes count for Control 17.9 (Part 2)
export async function fetchUnstableRoutesCount(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/networks/route-stability', {
      method: 'POST',
      body: {
        columns: ['prefix', 'ratioCrit', 'ratioWarn', 'ratioInfo'],
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      // Count routes with ratioCrit > 0 (routes that converged within last 15 mins = unstable)
      const unstableRoutes = response.data.filter(
        (entry: any) => entry.ratioCrit > 0
      ).length
      return {
        value: unstableRoutes,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'Route stability endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchUnstableRoutesCount] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `Route stability endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch errDisabled percentage for Control 17.9 (Part 3)
export async function fetchErrDisabledPercentage(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  try {
    const response = await apiCall('tables/inventory/interfaces', {
      method: 'POST',
      body: {
        columns: ['hostname', 'intName', 'errDisabled', 'l1'],
        snapshot: snapshotId,
        pagination: { limit: 10000, start: 0 }
      }
    })

    // Check for pagination truncation (if size equals limit, data might be truncated)
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      return {
        value: null,
        available: false,
        reason: 'Data truncated - pagination limit exceeded',
        truncated: true
      }
    }

    if (response && response.data && Array.isArray(response.data)) {
      // Filter for L1 up (physical up) interfaces
      const physicalUpInterfaces = response.data.filter(
        (entry: any) => entry.l1 === 'up'
      )
      const totalPhysicalUpPorts = physicalUpInterfaces.length

      // Count interfaces with errDisabled (field is not null/empty)
      const errDisabledInterfaces = physicalUpInterfaces.filter(
        (entry: any) => entry.errDisabled && entry.errDisabled.trim() !== ''
      ).length

      const percentage = totalPhysicalUpPorts > 0
        ? (errDisabledInterfaces / totalPhysicalUpPorts) * 100
        : 0
      return {
        value: Math.round(percentage * 100) / 100,
        available: true
      }
    }

    return {
      value: null,
      available: false,
      reason: 'Interfaces endpoint returned no data'
    }
  } catch (error) {
    console.error('[fetchErrDisabledPercentage] Failed:', error)
    return {
      value: null,
      available: false,
      reason: `Interfaces endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Fetch path lookup availability for Control 3.8 Extended (Two-tier detection)
export async function fetchPathLookupAvailability(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<{
  available: boolean
  reason?: string
  checkCount?: number
  method?: 'path-checks' | 'graph-api'
}> {
  // TIER 1: Check for saved path checks (preferred method)
  try {
    const pathCheckResponse = await apiCall(
      `graphs/path-lookup/checks/badge?snapshot=${snapshotId}`,
      { method: 'GET', skipSnapshot: true }
    )

    if (pathCheckResponse && !pathCheckResponse._error) {
      const checkCount = (pathCheckResponse as any)?.count ||
                        (pathCheckResponse as any)?.checks?.length ||
                        (pathCheckResponse as any)?.data?.length || 0

      if (checkCount > 0) {
        return {
          available: true,
          checkCount,
          method: 'path-checks'
        }
      }
    }
  } catch (error) {
    // Path checks not available, will try fallback
  }

  // TIER 2: Check if graph API is accessible (fallback)
  // Use /graphs/presets endpoint - system-level, more reliable than user-specific /graphs/views
  try {
    const graphPresetsResponse = await apiCall('graphs/presets', {
      method: 'GET',
      skipSnapshot: true  // Don't append snapshotId - graph endpoints don't use it
    })

    // Multiple ways to detect success - more robust
    const isSuccess = (
      graphPresetsResponse &&
      !graphPresetsResponse._error &&
      (
        Array.isArray(graphPresetsResponse) ||  // Direct array response
        graphPresetsResponse.data !== undefined ||  // Has data property
        graphPresetsResponse._meta !== undefined ||  // Has meta
        (typeof graphPresetsResponse === 'object' && Object.keys(graphPresetsResponse).length > 0)  // Has any properties
      )
    )

    if (isSuccess) {
      return {
        available: true,
        method: 'graph-api',
        reason: 'Network graph API accessible - data flow visualization capability available'
      }
    }
  } catch (graphError) {
    // Graph presets unavailable, try alternative
  }

  // TIER 2B: Try alternative graph endpoint if presets failed
  try {
    const layoutResponse = await apiCall(
      'graphs/default-layout/network-viewer?groupBy=siteName',
      {
        method: 'GET',
        skipSnapshot: true  // Don't append snapshotId - graph endpoints don't use it
      }
    )

    if (layoutResponse && !layoutResponse._error) {
      return {
        available: true,
        method: 'graph-api',
        reason: 'Network graph layout API accessible - visualization capability available'
      }
    }
  } catch (layoutError) {
    // Layout endpoint also unavailable
  }

  // Both tiers failed - truly not available
  return {
    available: false,
    reason: 'Path visualization not available - no path checks configured and graph API not accessible. This may be due to dedicated management networks, DNS caching, or ICMP filtering.'
  }
}

// ============================================================================
// PCI-DSS Specific Metrics
// ============================================================================

/**
 * Fetch count of established external BGP neighbors
 * Used by PCI-DSS Requirement 1.4.5 - Limit disclosure of internal IP addresses
 *
 * Filters for:
 * - State === 'establish' (active sessions only)
 * - NeighbourAS < 64512 (external/public AS numbers only, excludes private AS)
 *
 * @returns MetricResult with count of external BGP peers
 */
export async function fetchBgpNeighborsCount(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  const cacheKey = `bgp-neighbors-${snapshotId}`
  const cached = metricsCache.get(cacheKey) as CacheEntry<MetricResult<number>> | undefined
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const response = await apiCall('tables/routing/protocols/bgp/neighbors', {
      method: 'POST',
      body: {
        columns: ['hostname', 'vrf', 'localAs', 'neiAs', 'state'],
        filters: {
          and: [
            { state: ['eq', 'establish'] },
            { neiAs: ['lt', 64512] }  // External AS only (< 64512)
          ]
        },
        snapshot: snapshotId,
        pagination: { limit: 5000, start: 0 }
      }
    })

    // Check for API error
    if (response && response._error) {
      const result: MetricResult<number> = {
        value: null,
        available: false,
        reason: `BGP neighbors endpoint not available (${response._error.status})`
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    // Check for truncation
    if (response && response._meta && response._meta.size >= response._meta.limit) {
      const result: MetricResult<number> = {
        value: null,
        available: false,
        reason: 'BGP neighbors data truncated - pagination limit exceeded',
        truncated: true
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    if (response && response._meta) {
      const count = response._meta.size || 0
      const result: MetricResult<number> = {
        value: count,
        available: true
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    const result: MetricResult<number> = {
      value: null,
      available: false,
      reason: 'BGP neighbors endpoint returned no data'
    }
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch (error) {
    const result: MetricResult<number> = {
      value: null,
      available: false,
      reason: `BGP neighbors endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }
}

/**
 * Fetch count of wireless access points
 * Used by PCI-DSS Requirement 11.2.2 - Maintain inventory of authorized wireless APs
 *
 * @returns MetricResult with count of discovered wireless access points
 */
export async function fetchWirelessAPCount(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<number>> {
  const cacheKey = `wireless-aps-${snapshotId}`
  const cached = metricsCache.get(cacheKey) as CacheEntry<MetricResult<number>> | undefined
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const response = await apiCall('tables/wireless/access-points', {
      method: 'POST',
      body: {
        columns: ['apName', 'siteName', 'ssid'],
        snapshot: snapshotId
      }
    })

    // Check for API error
    if (response && response._error) {
      const result: MetricResult<number> = {
        value: null,
        available: false,
        reason: `Wireless APs endpoint not available (${response._error.status})`
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    // Check for truncation (skip if limit is null - means no pagination was requested)
    if (response && response._meta &&
        response._meta.limit !== null &&
        response._meta.size >= response._meta.limit) {
      const result: MetricResult<number> = {
        value: null,
        available: false,
        reason: 'Wireless AP data truncated - pagination limit exceeded',
        truncated: true
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    if (response && response._meta) {
      const count = response._meta.size || 0
      const result: MetricResult<number> = {
        value: count,
        available: true,
        // Mark as N/A if count is 0 (wired-only network)
        notApplicable: count === 0,
        reason: count === 0 ? 'No wireless infrastructure discovered (wired-only network)' : undefined
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    const result: MetricResult<number> = {
      value: null,
      available: false,
      reason: 'Wireless APs endpoint returned no data'
    }
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch (error) {
    const result: MetricResult<number> = {
      value: null,
      available: false,
      reason: `Wireless APs endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }
}

/**
 * Check if network diagram generation is available
 * Used by PCI-DSS Requirement 1.2.3 - Maintain accurate network diagrams
 *
 * Tests if the /graphs/png endpoint is accessible for the snapshot
 * @returns MetricResult with boolean indicating diagram availability
 */
export async function fetchDiagramAvailability(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<MetricResult<boolean>> {
  const cacheKey = `diagram-available-${snapshotId}`
  const cached = metricsCache.get(cacheKey) as CacheEntry<MetricResult<boolean>> | undefined
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    // Check if graph API is accessible by querying graph presets
    // This is more reliable than trying to generate a PNG which has complex parameters
    const response = await apiCall('graphs/presets', {
      method: 'GET',
      skipSnapshot: true
    })

    // If we get any response without error, diagram capability exists
    if (response && !response._error) {
      const result: MetricResult<boolean> = {
        value: true,
        available: true
      }
      metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    // Endpoint returned error
    const result: MetricResult<boolean> = {
      value: false,
      available: true,  // We know the answer (false), so available = true
      reason: `Diagram generation not supported (${response?._error?.status || 'unknown'})`
    }
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch (error) {
    // Could not reach endpoint
    const result: MetricResult<boolean> = {
      value: false,
      available: true,  // We know the answer (false), so available = true
      reason: `Diagram endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }
}