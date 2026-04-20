import { Device } from './device-generator'

export interface IntentCheckResult {
  name: string
  value: number
  color: string
}

export interface IntentCheckCategory {
  name: string
  passed: number
  failed: number
  warning: number
}

export interface IntentCheckIssue {
  issue: string
  category: string
  severity: 'failed' | 'warning'
  count: number
  devices: string[]
}

// Map device issues to intent check categories
const issueToCheckCategory: Record<string, { category: string; severity: 'failed' | 'warning' }> = {
  // Routing & Network issues
  'BGP session flapping': { category: 'Routing', severity: 'failed' },
  'OSPF neighbor state change': { category: 'Routing', severity: 'failed' },
  'MTU mismatch detected': { category: 'Routing', severity: 'warning' },
  'Duplicate IP address detected': { category: 'Routing', severity: 'failed' },

  // Security issues
  'Port security violation': { category: 'Security', severity: 'failed' },
  'ACL policy violation': { category: 'Security', severity: 'failed' },
  'Security policy violation': { category: 'Security', severity: 'failed' },
  'IPS signature update required': { category: 'Security', severity: 'warning' },
  'VPN tunnel down': { category: 'Security', severity: 'failed' },
  'License expiration warning': { category: 'Security', severity: 'warning' },

  // QoS issues
  'QoS policy drops detected': { category: 'QoS', severity: 'warning' },
  'High CPU utilization (>85%)': { category: 'QoS', severity: 'warning' },
  'Memory usage critical (>90%)': { category: 'QoS', severity: 'failed' },

  // Compliance & Configuration
  'Configuration drift detected': { category: 'Compliance', severity: 'failed' },
  'Firmware update available': { category: 'Compliance', severity: 'warning' },
  'SSL certificate expiring': { category: 'Compliance', severity: 'warning' },

  // VLAN & Switching
  'VLAN mismatch': { category: 'VLAN', severity: 'failed' },
  'Spanning tree topology change': { category: 'VLAN', severity: 'warning' },
  'Link aggregation member down': { category: 'VLAN', severity: 'warning' },
  'HSRP/VRRP state change': { category: 'VLAN', severity: 'warning' },
  'Interface errors detected': { category: 'VLAN', severity: 'warning' },

  // Hardware issues (map to appropriate categories)
  'Temperature threshold exceeded': { category: 'Compliance', severity: 'warning' },
  'Power supply redundancy lost': { category: 'Compliance', severity: 'warning' },
  'Fan failure detected': { category: 'Compliance', severity: 'warning' },

  // Wireless specific
  'RF interference detected': { category: 'QoS', severity: 'warning' },
  'Client association failures': { category: 'Security', severity: 'warning' },
  'Channel overlap detected': { category: 'QoS', severity: 'warning' },

  // Load Balancer specific
  'Backend server unreachable': { category: 'Routing', severity: 'failed' },
  'Health check failures': { category: 'QoS', severity: 'failed' },
}

/**
 * DEPRECATED: This function should NOT be used with real API data.
 * It was designed for demo mode only when no real report data is available.
 *
 * For production use with real IP Fabric data:
 * - Use the reports array directly from the API
 * - Extract categories from report.groups
 * - Do NOT use this synthetic calculation
 */
export function calculateIntentChecksFromDevices(
  devices: Device[],
  apiData?: { passed: number; failed: number; warning: number } | null
): {
  summary: IntentCheckResult[]
  categories: IntentCheckCategory[]
  totalChecks: number
  issues: IntentCheckIssue[]
} | null {
  // If no API data provided, return null (API unavailable)
  if (!apiData) {
    return null
  }

  // REAL API DATA - NO SYNTHETIC CALCULATION
  // Simply pass through the API summary without fabricating categories
  const totalApiChecks = apiData.passed + apiData.failed + apiData.warning

  // Return the API data directly without any synthetic calculations
  const summary: IntentCheckResult[] = [
    { name: 'Passed', value: apiData.passed, color: 'green' },
    { name: 'Failed', value: apiData.failed, color: 'red' },
    { name: 'Warning', value: apiData.warning, color: 'orange' },
  ]

  // No categories - these should come from actual report.groups in the API response
  // No issues - these should be extracted from reports array in the UI component
  return {
    summary,
    categories: [],  // Categories come from real report data
    totalChecks: totalApiChecks,
    issues: []  // Issues extracted from reports in UI
  }
}

// Generate trend data based on snapshot age
export function generateTrendData(basePassRate: number, snapshotAge: number): Array<{
  date: string
  Passed: number
  Failed: number
  Total: number
}> {
  const trendData = []
  const daysToShow = 7

  // Generate dates based on snapshot age
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - (snapshotAge * 30)) // Approximate age in days

  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() - (daysToShow - i - 1))

    // Add some variance to pass rate
    const variance = (Math.sin(i * 0.5) * 5) + (Math.random() * 3 - 1.5)
    const dayPassRate = Math.max(0, Math.min(100, basePassRate + variance))
    const dayFailRate = 100 - dayPassRate

    trendData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Passed: Math.round(dayPassRate),
      Failed: Math.round(dayFailRate),
      Total: 100
    })
  }

  return trendData
}