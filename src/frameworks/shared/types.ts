// Shared Framework Types
// Provides unified interfaces for framework abstraction layer

// Breakdown item for detailed scoring
export interface ComplianceBreakdownItem {
  metric: string
  value: number | string
  points: number
  rule: string
  previousValue?: number | string
  delta?: number | string
}

// Unified check/safeguard/sub-requirement detail
export interface ComplianceCheckDetail {
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
  breakdown?: ComplianceBreakdownItem[]
}

// Unified control/requirement category
export interface ComplianceCategory {
  id: string
  name: string
  score: number
  maxScore: number
  status: 'pass' | 'warning'  // NO 'fail' - cap at warning (amber/orange)
  ragColor?: 'green' | 'amber'  // NO RED - consistent design philosophy
  loading?: boolean
  details?: ComplianceCheckDetail[]
}

// Framework configuration contract
export interface FrameworkConfig {
  id: FrameworkId
  name: string
  version: string
  maxScore: number
  categoryLabel: string      // "Control" for CIS, "Requirement" for PCI-DSS
  checkLabel: string         // "Safeguard" for CIS, "Sub-Requirement" for PCI-DSS
  totalCategories: number    // 11 for CIS, 8 for PCI-DSS
  getBatchDescription: (batchNum: number) => string
  categories: CategoryConfig[]
}

export interface CategoryConfig {
  id: string
  name: string
  maxScore: number
}

// Framework IDs type
export type FrameworkId = 'cis-v8' | 'pci-dss' | 'dora' | 'nist' | 'nis2' | 'hipaa' | 'iso27001'

// Calculator function signatures
// Note: Each framework has different signatures, so we use Function type
export type ProgressiveCalculator = Function

export type ScoreCalculator = Function
