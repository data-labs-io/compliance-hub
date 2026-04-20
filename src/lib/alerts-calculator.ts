// Shared utility for calculating compliance-based active alerts
import { Device } from './device-generator'
import { CISControl } from './cis-calculator'
import type { PCIDSSRequirement } from '@/frameworks/pci-dss'
import type { NISTCSFFunction } from '@/frameworks/nist-csf'
import type { NIS2Article } from '@/frameworks/nis2'
import type { ComplianceAlert } from '@/types/alerts'

// Union type for all framework controls
type FrameworkControl = CISControl | PCIDSSRequirement | NISTCSFFunction | NIS2Article

// Helper function to get framework display names
function getFrameworkDisplayName(framework: 'cis-v8' | 'pci-dss' | 'nist-csf' | 'nis2'): string {
  switch (framework) {
    case 'cis-v8':
      return 'CIS'
    case 'pci-dss':
      return 'PCI-DSS'
    case 'nist-csf':
      return 'NIST CSF'
    case 'nis2':
      return 'NIS2'
  }
}

// Helper function to get framework-specific alert type
function getFrameworkAlertType(framework: 'cis-v8' | 'pci-dss' | 'nist-csf' | 'nis2'): 'cis-control' | 'pci-dss-requirement' | 'nist-csf-function' | 'nis2-article' {
  switch (framework) {
    case 'cis-v8':
      return 'cis-control'
    case 'pci-dss':
      return 'pci-dss-requirement'
    case 'nist-csf':
      return 'nist-csf-function'
    case 'nis2':
      return 'nis2-article'
  }
}

// Helper function to get framework-specific control name
function getFrameworkControlName(framework: 'cis-v8' | 'pci-dss' | 'nist-csf' | 'nis2'): string {
  switch (framework) {
    case 'cis-v8':
      return 'Control'
    case 'pci-dss':
      return 'Requirement'
    case 'nist-csf':
      return 'Function'
    case 'nis2':
      return 'Article'
  }
}

export function calculateActiveAlerts(
  devices: Device[],
  complianceScore: number,
  intentChecksFailed: number,
  controls: FrameworkControl[] = [],
  framework: 'cis-v8' | 'pci-dss' | 'nist-csf' | 'nis2' = 'cis-v8'
): number {
  // Active alerts now reflect compliance issues that need immediate attention
  let alerts = 0

  // 1. Overall compliance score alerts
  if (complianceScore < 70) {
    alerts++ // Critical: Compliance below 70%
  } else if (complianceScore < 80) {
    alerts++ // Warning: Compliance below 80%
  }

  // 2. Failed and warning framework controls
  const failedControls = controls.filter(c => c.status === 'fail').length
  const warningControls = controls.filter(c => c.status === 'warning').length
  alerts += failedControls  // Each failed control = 1 alert
  alerts += Math.floor(warningControls / 2)  // Every 2 warning controls = 1 alert

  // 3. Intent check failures (compliance violations)
  if (intentChecksFailed > 20) {
    alerts++  // High failure rate indicates compliance issues
  }

  // 4. Critical device issues (offline devices indicate infrastructure problems)
  const offlineDevices = devices.filter(d => d.status === 'offline').length
  if (offlineDevices > 0) {
    alerts++  // Offline devices affect compliance
  }

  return alerts
}

// Generate detailed alerts for display on alerts page
export function generateComplianceAlerts(
  devices: Device[],
  complianceScore: number,
  intentChecksFailed: number,
  intentChecksPassed: number,
  controls: FrameworkControl[] = [],
  framework: 'cis-v8' | 'pci-dss' | 'nist-csf' | 'nis2' = 'cis-v8'
): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = []

  // 1. Low Compliance Score Alert
  if (complianceScore < 80) {
    alerts.push({
      id: 'low-compliance-score',
      type: 'compliance-score',
      severity: complianceScore < 70 ? 'important' : 'warning',
      title: `Compliance Score ${complianceScore < 70 ? 'Important' : 'Below Target'}`,
      description: `Overall network compliance score is ${complianceScore.toFixed(1)}%, which is ${complianceScore < 70 ? 'significantly low' : 'below the recommended 80% threshold'}.`,
      currentValue: `${complianceScore.toFixed(1)}%`,
      expectedValue: '80%',
      impact: 'Network does not meet compliance standards and may be at risk',
      recommendation: `Review failed ${getFrameworkDisplayName(framework)} controls and address underlying issues to improve compliance score`,
      link: '#compliance-overview'
    })
  }

  // 2. Failed Framework Controls
  const alertType = getFrameworkAlertType(framework)
  const controlName = getFrameworkControlName(framework)
  const frameworkName = getFrameworkDisplayName(framework)

  controls.filter(c => c.status === 'fail').forEach(control => {
    const percentage = (control.score / control.maxScore) * 100
    alerts.push({
      id: `${framework}-control-${control.id}-fail`,
      type: alertType,
      severity: 'important',
      title: `${frameworkName} ${controlName} ${control.id} Failed`,
      description: `${control.name} scored ${control.score.toFixed(1)}/${control.maxScore} points (${percentage.toFixed(1)}%)`,
      currentValue: `${control.score.toFixed(1)}/${control.maxScore}`,
      expectedValue: `≥${(control.maxScore * 0.8).toFixed(1)}/${control.maxScore}`,
      impact: `Important compliance ${controlName.toLowerCase()} not meeting standards`,
      recommendation: control.details ? `Review: ${control.details.map(d => d.name).join(', ')}` : `Review ${controlName.toLowerCase()} requirements`,
      controlId: control.id
    })
  })

  // 3. Warning Framework Controls
  controls.filter(c => c.status === 'warning').forEach(control => {
    const percentage = (control.score / control.maxScore) * 100
    alerts.push({
      id: `${framework}-control-${control.id}-warning`,
      type: alertType,
      severity: 'warning',
      title: `${frameworkName} ${controlName} ${control.id} Needs Improvement`,
      description: `${control.name} scored ${control.score.toFixed(1)}/${control.maxScore} points (${percentage.toFixed(1)}%)`,
      currentValue: `${control.score.toFixed(1)}/${control.maxScore}`,
      expectedValue: `≥${(control.maxScore * 0.8).toFixed(1)}/${control.maxScore}`,
      impact: `Compliance ${controlName.toLowerCase()} below optimal level`,
      recommendation: control.details ? `Improve: ${control.details.map(d => d.name).join(', ')}` : `Review ${controlName.toLowerCase()} requirements`,
      controlId: control.id
    })
  })

  // 4. High Intent Check Failures
  if (intentChecksFailed > 20) {
    const totalChecks = intentChecksPassed + intentChecksFailed
    const failureRate = totalChecks > 0 ? ((intentChecksFailed / totalChecks) * 100).toFixed(1) : '0'
    alerts.push({
      id: 'high-intent-failures',
      type: 'intent-failures',
      severity: intentChecksFailed > 40 ? 'important' : 'warning',
      title: 'High Intent Verification Failure Rate',
      description: `${intentChecksFailed} intent verification reports have failed checks`,
      currentValue: `${intentChecksFailed} failed (${failureRate}% failure rate)`,
      expectedValue: '<20 failed reports',
      impact: 'Network configuration does not meet compliance rules and best practices',
      recommendation: 'Review failed intent checks in the Intent Verification section and remediate identified issues',
      link: '/dashboard/intent-checks?tab=issues',
      affectedCount: intentChecksFailed
    })
  }

  // 5. Offline Devices
  const offlineDevices = devices.filter(d => d.status === 'offline')
  if (offlineDevices.length > 0) {
    alerts.push({
      id: 'offline-devices',
      type: 'offline-devices',
      severity: offlineDevices.length > 5 ? 'important' : 'warning',
      title: 'Devices Offline',
      description: `${offlineDevices.length} network devices are currently offline or unreachable`,
      currentValue: offlineDevices.length,
      expectedValue: '0',
      impact: 'Affects network availability and compliance metrics accuracy',
      recommendation: 'Investigate connectivity issues and restore device availability',
      link: '/dashboard/devices?status=offline',
      affectedCount: offlineDevices.length
    })
  }

  // Sort by severity (important first)
  return alerts.sort((a, b) => {
    if (a.severity === 'important' && b.severity !== 'important') return -1
    if (a.severity !== 'important' && b.severity === 'important') return 1
    if (a.severity === 'warning' && b.severity === 'info') return -1
    if (a.severity === 'info' && b.severity === 'warning') return 1
    return 0
  })
}