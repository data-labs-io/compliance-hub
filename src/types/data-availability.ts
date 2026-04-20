// Types for tracking API data availability and missing data impacts

export interface DataSourceAvailability {
  available: boolean
  endpoint: string
  impact: string
  fallbackUsed?: boolean
  fallbackValue?: any
}

export interface MissingDataWarning {
  dataType: string
  endpoint: string
  impact: string
  severity: 'low' | 'medium' | 'high'
  affectedMetrics?: string[]
  recommendation?: string
}

export interface DataAvailabilityReport {
  intentChecks: DataSourceAvailability
  discoveryErrors: DataSourceAvailability
  endOfSupport: DataSourceAvailability
  versionConsistency: DataSourceAvailability
  platformTypes: DataSourceAvailability
  siteCount: DataSourceAvailability
  timestamp: Date
}

export interface DataAvailabilitySummary {
  completeData: boolean
  availableDataSources: string[]
  missingDataSources: MissingDataWarning[]
  confidenceLevel: 'high' | 'medium' | 'low'
  affectedMetrics: string[]
  overallImpact: string
}

// Helper to calculate confidence level based on available data
export function calculateConfidenceLevel(
  availableCount: number,
  totalCount: number
): 'high' | 'medium' | 'low' {
  const percentage = (availableCount / totalCount) * 100
  if (percentage >= 80) return 'high'
  if (percentage >= 50) return 'medium'
  return 'low'
}

// Helper to generate impact descriptions
export function getImpactDescription(dataType: string): string {
  const impacts: Record<string, string> = {
    'intentChecks': 'Compliance validation and network rule checks unavailable',
    'discoveryErrors': 'Cannot detect device discovery issues or unreachable devices',
    'endOfSupport': 'Limited end-of-support detection, may miss outdated devices',
    'versionConsistency': 'Version variance calculated from limited data',
    'platformTypes': 'Platform diversity metrics may be incomplete',
    'siteCount': 'Site information may not reflect actual network topology'
  }
  return impacts[dataType] || 'Data unavailable, metrics may be affected'
}

// Helper to get CIS control impacts
export function getCISControlImpacts(missingData: string[]): Record<string, string> {
  const impacts: Record<string, string> = {}

  if (missingData.includes('discoveryErrors')) {
    impacts['1.2'] = 'Discovery issues defaulting to 0 - may not reflect actual problems'
  }

  if (missingData.includes('intentChecks')) {
    impacts['1.3'] = 'Intent checks unavailable - scored as 0 points'
  }

  if (missingData.includes('endOfSupport')) {
    impacts['2.2'] = 'End-of-support detection limited - lifecycle score may be inaccurate'
  }

  if (missingData.includes('versionConsistency')) {
    impacts['2.1'] = 'Version variance using simplified calculation'
  }

  return impacts
}