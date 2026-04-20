import { Info, Calculator, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CISControlDetail } from '@/frameworks/cis'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'

interface DeltaScoringExplanationProps {
  controlId: string
  currentDetails?: CISControlDetail[]
  previousDetails?: CISControlDetail[]
}

/**
 * Component that explains delta-based scoring calculations
 * Shows why scores changed due to delta conditions
 */
export function DeltaScoringExplanation({
  controlId,
  currentDetails,
  previousDetails
}: DeltaScoringExplanationProps) {
  const { isColorBlindMode } = useColorBlindMode()

  if (!currentDetails || !previousDetails) {
    return null
  }

  // Find safeguards that use delta-based scoring and had score changes
  const deltaBasedSafeguards = currentDetails.filter(detail => {
    // Check if this safeguard uses delta-based scoring
    const isDeltaBased =
      detail.scoringRule?.toLowerCase().includes('delta') ||
      detail.scoringRule?.toLowerCase().includes('if ')

    // Only show if delta-based AND has comparison data
    return isDeltaBased && detail.previousValue !== undefined && detail.delta !== undefined
  })

  if (deltaBasedSafeguards.length === 0) {
    return null
  }

  return (
    <div className="mt-4 space-y-3">
      {deltaBasedSafeguards.map(safeguard => (
        <DeltaCalculationCard
          key={safeguard.id}
          safeguard={safeguard}
          isColorBlindMode={isColorBlindMode}
        />
      ))}
    </div>
  )
}

/**
 * Card showing detailed delta calculation for a single safeguard
 */
function DeltaCalculationCard({ safeguard, isColorBlindMode }: { safeguard: CISControlDetail; isColorBlindMode: boolean }) {
  // Extract numeric delta for condition checking
  const numericDelta = typeof safeguard.delta === 'number'
    ? safeguard.delta
    : typeof safeguard.delta === 'string'
      ? parseFloat(safeguard.delta.replace(/[^0-9.-]/g, ''))
      : null

  // Determine if condition was met based on scoring rule
  const conditionMet = determineConditionMet(safeguard, numericDelta)
  const lostPoints = conditionMet === false && safeguard.calculatedPoints === 0

  // Format numbers with commas
  const formatNumber = (val: any): string => {
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''))
    if (isNaN(num)) return String(val)
    return num.toLocaleString()
  }

  return (
    <div className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/30 dark:to-transparent rounded-lg p-3 border border-amber-100 dark:border-amber-800">
      <div className="flex items-start gap-2 mb-3">
        <Calculator className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
            Delta-Based Scoring Applied: {safeguard.id}
          </span>
          {safeguard.name && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{safeguard.name}</p>
          )}
        </div>
      </div>

      <div className="ml-6 space-y-2">
        {/* Scoring Rule */}
        {safeguard.scoringRule && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded px-2 py-1.5 border border-blue-100 dark:border-blue-800">
            <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Rule: </span>
            <span className="text-xs text-blue-700 dark:text-blue-400">{safeguard.scoringRule}</span>
          </div>
        )}

        {/* Target */}
        {extractTarget(safeguard.scoringRule) && (
          <div className={cn(
            "rounded px-2 py-1.5 border",
            isColorBlindMode ? "bg-accessible-success/10 border-accessible-success/30" : "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-700"
          )}>
            <span className={cn("text-xs font-medium", isColorBlindMode ? "text-accessible-success" : "text-green-800 dark:text-green-300")}>Target: </span>
            <span className={cn("text-xs", isColorBlindMode ? "text-accessible-success" : "text-green-700 dark:text-green-400")}>{extractTarget(safeguard.scoringRule)}</span>
          </div>
        )}

        {/* Calculation Breakdown */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded px-3 py-2 border border-gray-200 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-2">Calculation:</div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-500">•</span>
              <span className="text-gray-700 dark:text-gray-300">
                Previous Value: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatNumber(safeguard.previousValue)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-500">•</span>
              <span className="text-gray-700 dark:text-gray-300">
                Current Value: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatNumber(safeguard.currentValue)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-500">•</span>
              <span className="text-gray-700 dark:text-gray-300">
                Delta: <span className={cn(
                  "font-semibold",
                  numericDelta !== null && numericDelta < 0 ? (isColorBlindMode ? "text-accessible-error" : "text-orange-700 dark:text-orange-400") :
                  numericDelta !== null && numericDelta > 0 ? (isColorBlindMode ? "text-accessible-success" : "text-green-700 dark:text-green-400") :
                  "text-gray-700 dark:text-gray-300"
                )}>{safeguard.delta}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-500">•</span>
              <span className="text-gray-700 dark:text-gray-300">
                Condition: <span className="text-gray-600 dark:text-gray-400">{extractCondition(numericDelta, safeguard.scoringRule)}</span>
                {conditionMet !== null && (
                  <span className={cn(
                    "ml-2 font-bold inline-flex items-center gap-1",
                    conditionMet
                      ? (isColorBlindMode ? "text-accessible-success" : "text-green-600 dark:text-green-400")
                      : (isColorBlindMode ? "text-accessible-error" : "text-red-600 dark:text-red-400")
                  )}>
                    {conditionMet ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {conditionMet ? 'PASSED' : 'FAILED'}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-500">•</span>
              <span className="text-gray-700 dark:text-gray-300">
                Points Awarded: <span className={cn(
                  "font-bold",
                  lostPoints
                    ? (isColorBlindMode ? "text-accessible-error" : "text-red-600 dark:text-red-400")
                    : (isColorBlindMode ? "text-accessible-success" : "text-green-600 dark:text-green-400")
                )}>{safeguard.calculatedPoints.toFixed(1)} / {safeguard.maxPoints}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Explanation - only show when points were lost due to delta */}
        {lostPoints && (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1.5 border border-amber-200 dark:border-amber-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
              This safeguard uses delta-based scoring. Your score was set to 0 because the delta condition was not met.
              {getRecommendation(safeguard, numericDelta)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Determine if the delta condition was met based on scoring rule
 */
function determineConditionMet(safeguard: CISControlDetail, numericDelta: number | null): boolean | null {
  if (numericDelta === null) return null

  const rule = safeguard.scoringRule?.toLowerCase() || ''

  // Check for "Delta ≥ 0" or "if Delta≥0"
  if (rule.includes('delta≥0') || rule.includes('delta ≥ 0')) {
    return numericDelta >= 0
  }

  // Check for "Delta ≤ 0" or "if Delta≤0"
  if (rule.includes('delta≤0') || rule.includes('delta ≤ 0')) {
    return numericDelta <= 0
  }

  // Check for "Delta > 0"
  if (rule.includes('delta>0') || rule.includes('delta > 0')) {
    return numericDelta > 0
  }

  // Check for "Delta < 0"
  if (rule.includes('delta<0') || rule.includes('delta < 0')) {
    return numericDelta < 0
  }

  // Default: if we can't determine, return null
  return null
}

/**
 * Extract target information from scoring rule
 */
function extractTarget(scoringRule?: string): string | null {
  if (!scoringRule) return null

  // Look for "(target: X)" pattern
  const targetMatch = scoringRule.match(/\(target:\s*([^)]+)\)/i)
  if (targetMatch) {
    return targetMatch[1].trim()
  }

  // Look for "Delta ≥ 0" patterns in the rule
  if (scoringRule.includes('Delta ≥ 0')) {
    return 'Delta ≥ 0'
  }
  if (scoringRule.includes('Delta ≤ 0')) {
    return 'Delta ≤ 0'
  }

  return null
}

/**
 * Extract and format the condition being evaluated
 */
function extractCondition(numericDelta: number | null, scoringRule?: string): string {
  if (numericDelta === null) return 'N/A'

  const rule = scoringRule?.toLowerCase() || ''

  if (rule.includes('delta≥0') || rule.includes('delta ≥ 0')) {
    return `${numericDelta} ≥ 0?`
  }
  if (rule.includes('delta≤0') || rule.includes('delta ≤ 0')) {
    return `${numericDelta} ≤ 0?`
  }
  if (rule.includes('delta>0') || rule.includes('delta > 0')) {
    return `${numericDelta} > 0?`
  }
  if (rule.includes('delta<0') || rule.includes('delta < 0')) {
    return `${numericDelta} < 0?`
  }

  return 'Condition evaluation'
}

/**
 * Get actionable recommendation based on the failure
 */
function getRecommendation(safeguard: CISControlDetail, numericDelta: number | null): string {
  if (numericDelta === null) return ''

  const rule = safeguard.scoringRule?.toLowerCase() || ''
  const context = safeguard.ipFabricContext?.toLowerCase() || ''

  // Routes decreased
  if (context.includes('route') && numericDelta < 0) {
    return ' Maintain or increase route count to earn points. Route decreases may indicate connectivity issues or decomm.'
  }

  // Zone firewall decreased
  if (context.includes('zone') && context.includes('firewall') && numericDelta < 0) {
    return ' Maintain or increase firewall policies to earn points. Policy reductions may indicate weakened segmentation.'
  }

  // ANY/ANY increased (reverse polarity)
  if (context.includes('any/any') && numericDelta > 0) {
    return ' Reduce ANY/ANY rules to earn points. These overly-permissive rules are security risks.'
  }

  // AAA/Flow/DNS decreased
  if ((context.includes('aaa') || context.includes('flow') || context.includes('dns')) && numericDelta < 0) {
    return ' Maintain or increase coverage to earn points. Reductions indicate weakened security posture.'
  }

  // Generic
  if (numericDelta < 0) {
    return ' The metric decreased below the target threshold. Review recent changes to understand the regression.'
  } else {
    return ' The metric increased but in an undesirable direction. Review the target to understand the requirement.'
  }
}
