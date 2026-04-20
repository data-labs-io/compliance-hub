// Types for compliance-based alerts system

export type AlertType =
  | 'compliance-score'
  | 'cis-control'
  | 'pci-dss-requirement'
  | 'nist-csf-function'
  | 'nis2-article'
  | 'version-variance'
  | 'eos-devices'
  | 'discovery-errors'
  | 'intent-failures'
  | 'offline-devices'

export type AlertSeverity = 'important' | 'warning' | 'info'

export interface ComplianceAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  currentValue: string | number
  expectedValue?: string | number
  impact: string
  recommendation: string
  link?: string  // URL or route to relevant section
  controlId?: string  // For CIS control alerts
  affectedCount?: number  // Number of devices/items affected
}
