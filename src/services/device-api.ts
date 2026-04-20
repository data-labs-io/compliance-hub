// Device API Service - Fetches real data from IP Fabric API
// Falls back to simulated data in demo mode or when API is unavailable

import { Device, generateDevicesForSnapshot } from '@/lib/device-generator'
import { cachedApiCall } from '@/lib/request-cache'
import type {
  APICallFunction,
  IntentCheckStatus,
  IntentCheckReport
} from '@/types/ipfabric-api'

// Helper function to parse intent check status from various formats
export function parseIntentCheckStatus(check: IntentCheckStatus | Record<string, unknown> | string | number | undefined | null): 'passed' | 'failed' | 'warning' | null {
  // Handle different input types
  let status: unknown = check

  // If check is an object with status/result/state properties
  if (check && typeof check === 'object' && !Array.isArray(check)) {
    const checkObj = check as Record<string, unknown>
    status = checkObj.status || checkObj.result || checkObj.state || check
  }

  // Handle string and numeric statuses - comprehensive format support
  if (status === 'green' || status === 'passed' || status === 'pass' ||
      status === 0 || status === '0' || status === 'ok' || status === 'success') {
    return 'passed'
  } else if (status === 'red' || status === 'failed' || status === 'fail' ||
             status === 20 || status === '20' || status === 'error' || status === 'critical') {
    return 'failed'
  } else if (status === 'amber' || status === 'yellow' || status === 'warning' ||
             status === 10 || status === '10' || status === 'warn') {
    return 'warning'
  }

  return null
}

interface IPFabricDevice {
  id: string
  hostname: string
  loginIp?: string
  siteName?: string
  devType?: string
  vendor?: string
  model?: string
  version?: string
  sn?: string
  stpDomain?: number
  loginType?: string
  uptime?: number
  reload?: string
  memoryUtilization?: number
  cpuUtilization?: number
}

interface DeviceInventoryResponse {
  data: IPFabricDevice[]
  _meta?: {
    count: number
    limit: number
    start: number
    total: number
  }
}

// Convert IP Fabric device to our Device type
function mapIPFabricDevice(device: IPFabricDevice): Device {
  // Determine status based on available metrics
  let status: Device['status'] = 'online'

  if (!device.loginType || device.loginType === 'none') {
    status = 'offline'
  } else if (device.memoryUtilization && device.memoryUtilization > 90) {
    status = 'warning'
  }

  // Calculate compliance score based on various factors
  let complianceScore = 85 // Base score

  if (status === 'offline') {
    complianceScore = 0
  } else if (status === 'warning') {
    complianceScore = 70
  }

  // Adjust based on Memory if available
  if (device.memoryUtilization && device.memoryUtilization > 80) {
    complianceScore -= 10
  }

  complianceScore = Math.max(0, Math.min(100, complianceScore))

  // Count issues based on metrics
  let issues = 0
  const issueDetails: string[] = []

  if (device.memoryUtilization && device.memoryUtilization > 90) {
    issues++
    issueDetails.push('Memory usage critical (>90%)')
  }
  if (status === 'offline') {
    issues += 3
    issueDetails.push('Device offline')
  }

  return {
    id: device.id || `dev-${device.hostname}`,
    hostname: device.hostname || 'unknown',
    ipAddress: device.loginIp || '0.0.0.0',
    site: device.siteName || 'Default',
    type: mapDeviceType(device.devType),
    vendor: device.vendor || 'Unknown',
    model: device.model || 'Unknown',
    status,
    complianceScore,
    lastSeen: device.reload || new Date().toISOString(),
    issues,
    issueDetails,
    serialNumber: device.sn || 'N/A',
    version: device.version || '1.0.0'
  }
}

// Map IP Fabric device types to our types
function mapDeviceType(devType?: string): Device['type'] {
  if (!devType) return 'Switch'

  const typeMap: Record<string, Device['type']> = {
    'router': 'Router',
    'switch': 'Switch',
    'firewall': 'Firewall',
    'fw': 'Firewall',
    'wireless': 'Wireless',
    'ap': 'Wireless',
    'wlc': 'Wireless',
    'lb': 'Load Balancer',
    'loadbalancer': 'Load Balancer',
    'l3switch': 'Switch'
  }

  const lowercaseType = devType.toLowerCase()

  for (const [key, value] of Object.entries(typeMap)) {
    if (lowercaseType.includes(key)) {
      return value
    }
  }

  return 'Switch' // Default
}

// Fetch devices from IP Fabric API
export async function fetchDevicesFromAPI(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<Device[] | null> {
  const cacheKey = `devices-${snapshotId}`

  return cachedApiCall(
    cacheKey,
    async () => {
      // IP Fabric inventory endpoint - using tables endpoint
      const response = await apiCall('tables/inventory/devices', {
        method: 'POST',
        body: {
          columns: [
            'id',
            'hostname',
            'loginIp',
            'siteName',
            'devType',
            'vendor',
            'model',
            'version',
            'sn',
            'loginType',
            'reload',
            'memoryUtilization',
            'uptime'
          ],
          filters: {},
          pagination: {
            limit: 1000,
            start: 0
          },
          reports: '/technology/management/dns/records',
          sort: {
            column: 'hostname',
            order: 'asc'
          },
          snapshot: snapshotId
        }
      })

      // Check if endpoint returned an error (404/410)
      if (response && response._error) {
        console.warn(`[fetchDevicesFromAPI] Devices endpoint not available (${response._error.status}), returning null`)
        return null
      }

      // Debug: Log what we actually received
      if (typeof window !== 'undefined') {
        const debugWindow = window as Window & { __IPFABRIC_LAST_RESPONSE?: unknown }
        debugWindow.__IPFABRIC_LAST_RESPONSE = {
          hasResponse: !!response,
          responseType: typeof response,
          responseKeys: response ? Object.keys(response) : [],
          hasData: !!(response && response.data),
          dataType: response?.data ? typeof response.data : 'none',
          isArray: Array.isArray(response?.data),
          dataLength: Array.isArray(response?.data) ? response.data.length : 'not array',
          snapshot: snapshotId,
          timestamp: new Date().toISOString()
        }
      }

      // Check response structure
      if (response && response.data && Array.isArray(response.data)) {
        const devices = response.data.map(mapIPFabricDevice)
        return devices
      }

      // Also try if response is directly an array (different API format)
      if (Array.isArray(response)) {
        const devices = response.map(mapIPFabricDevice)
        return devices
      }

      // If response exists but has wrong structure, still return null
      // This helps us distinguish between API errors and wrong data format
      return null
    }
  )
}

// Fetch intent check results from IP Fabric API - using reports endpoint
// Returns REPORT-level counts (not individual check counts) for meaningful metrics
export async function fetchIntentChecksFromAPI(
  snapshotId: string,
  apiCall: APICallFunction
): Promise<{ passed: number; failed: number; warning: number; endpoint?: string; reports?: IntentCheckReport[] } | null> {
  const cacheKey = `intent-checks-${snapshotId}`

  return cachedApiCall(
    cacheKey,
    async () => {
      try {
        // IP Fabric uses GET /reports endpoint for intent verification checks
        const response = await apiCall(`reports?snapshot=${snapshotId}`, {
          method: 'GET',
          skipSnapshot: true  // Already in URL
        })

        // Check if endpoint returned an error
        if (response && response._error) {
          console.warn(`[fetchIntentChecksFromAPI] Reports endpoint not available (${response._error.status})`)
          return null
        }

        // Response should be an array of report objects
        if (Array.isArray(response)) {
          // Count REPORTS by their overall status (not individual checks)
          // This gives a meaningful metric: "X reports have issues" instead of "39,000 checks"
          let reportsWithFailures = 0
          let reportsWithWarnings = 0
          let reportsFullyPassed = 0
          let totalIssueCount = 0  // Total failed + warning items across all reports

          response.forEach((report: IntentCheckReport) => {
            if (report.result && report.result.checks) {
              const checks = report.result.checks

              const failedInReport = (checks['20'] || 0) + (checks['30'] || 0)
              const warningsInReport = checks['10'] || 0
              const passedInReport = checks['0'] || 0

              // Count this report based on its worst status
              if (failedInReport > 0) {
                reportsWithFailures++
                totalIssueCount += failedInReport
              } else if (warningsInReport > 0) {
                reportsWithWarnings++
                totalIssueCount += warningsInReport
              } else if (passedInReport > 0 || report.result.count > 0) {
                reportsFullyPassed++
              }
            }
          })

          // Return report-level counts (more meaningful than 39k individual checks)
          return {
            passed: reportsFullyPassed,
            failed: reportsWithFailures,
            warning: reportsWithWarnings,
            endpoint: 'reports',
            reports: response  // Include full reports for detailed display
          }
        }

        console.warn('[fetchIntentChecksFromAPI] Reports endpoint returned unexpected format')
        return null
      } catch (error) {
        console.error('[fetchIntentChecksFromAPI] Error fetching intent checks:', error)
        return null
      }
    }
  )
}

// Main function to get devices - tries API first, falls back to simulation
export async function getDevices(
  snapshotId: string,
  apiCall?: (endpoint: string, options?: any) => Promise<any>,
  isDemoMode?: boolean
): Promise<Device[]> {
  // If in demo mode, always use simulated data
  if (isDemoMode) {
    const deviceCounts: Record<string, number> = {
      '$last': 245,
      'snap-2025-09-17-12-00-00': 238,
      'snap-2025-09-16-12-00-00': 241,
      'snap-2025-09-15-12-00-00': 235,
      'snap-2025-02-05-07-27-18': 198,
      'snap-2024-11-12-00-00-14': 178,
    }
    const count = deviceCounts[snapshotId] || deviceCounts['$last']
    return generateDevicesForSnapshot(snapshotId, count)
  }

  // REAL DATA ONLY - NO FALLBACK TO SIMULATION
  if (apiCall) {
    try {
      const devices = await fetchDevicesFromAPI(snapshotId, apiCall)
      if (devices && devices.length > 0) {
        return devices
      }
      console.warn(`[getDevices] No devices returned from API for snapshot ${snapshotId}`)
    } catch (error) {
      console.error('[getDevices] Error fetching devices:', error)
      // Store error for debugging (will show in dev tools)
      if (typeof window !== 'undefined') {
        const debugWindow = window as Window & { __IPFABRIC_API_ERROR?: unknown }
        debugWindow.__IPFABRIC_API_ERROR = {
          error: error instanceof Error ? error.message : String(error),
          snapshot: snapshotId,
          timestamp: new Date().toISOString()
        }
      }
    }
    // Return empty array if API fails - NO SIMULATED DATA
    console.warn(`[getDevices] Returning empty array for snapshot ${snapshotId} - API failed or returned no data`)
    return []
  }

  // No API call function - return empty array
  return []
}

// Get intent checks - returns null when API is unavailable (no fallback)
export async function getIntentChecks(
  snapshotId: string,
  devices: Device[],
  apiCall?: (endpoint: string, options?: any) => Promise<any>,
  isDemoMode?: boolean
): Promise<{ passed: number; failed: number; warning: number } | null> {
  // If not in demo mode and apiCall is available, try API first
  if (!isDemoMode && apiCall) {
    const intentChecks = await fetchIntentChecksFromAPI(snapshotId, apiCall)
    if (intentChecks) {
      return intentChecks
    }
  }

  // If in demo mode, provide minimal simulated data for demonstration purposes
  if (isDemoMode) {
    // Simple demo data - NOT based on device count, just static demo values
    return { passed: 42, failed: 5, warning: 3 }
  }

  // API unavailable and not in demo mode - return null instead of calculating
  console.warn('[getIntentChecks] Intent checks API unavailable - returning null (no fallback calculation)')
  return null
}