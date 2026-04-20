import { cn } from '@/lib/utils'

interface ScoringMethodDisplayProps {
  scoringRule: string
  className?: string
}

/**
 * Smart component that parses and formats complex scoring rules for better readability
 * Handles graduated thresholds, delta conditions, formulas, and targets
 */
export function ScoringMethodDisplay({ scoringRule, className }: ScoringMethodDisplayProps) {
  // Check if this is a graduated threshold scoring rule
  const isGraduated = scoringRule.toLowerCase().includes('graduated')

  // Extract target information
  const targetMatch = scoringRule.match(/\(?\s*target:\s*([^)]+)\)?/i)
  const target = targetMatch ? targetMatch[1].trim() : null

  // Extract conditional logic (if/else statements)
  const conditionMatch = scoringRule.match(/\(?\s*if\s+([^,)]+)(?:,\s*else\s+([^)]+))?\)?/i)
  const condition = conditionMatch ? conditionMatch[1].trim() : null
  const elseCondition = conditionMatch && conditionMatch[2] ? conditionMatch[2].trim() : null

  if (isGraduated) {
    return <GraduatedScoringDisplay scoringRule={scoringRule} target={target} condition={condition} elseCondition={elseCondition} className={className} />
  }

  // Simple formula-based scoring
  return <SimpleScoringDisplay scoringRule={scoringRule} target={target} condition={condition} className={className} />
}

/**
 * Display for graduated threshold scoring rules
 */
function GraduatedScoringDisplay({
  scoringRule,
  target,
  condition,
  elseCondition,
  className
}: {
  scoringRule: string
  target: string | null
  condition: string | null
  elseCondition: string | null
  className?: string
}) {
  // Parse graduated thresholds from the rule
  const thresholds: { range: string, points: string }[] = []

  // Pattern: "0=0pts" or "10+=2pts" or "2-9=1pt"
  const thresholdPattern = /(\d+\+?|\d+-\d+)\s*(?:policies?|policy|rules?|=)\s*[=]?\s*(\d+(?:\.\d+)?)\s*pts?/gi
  let match
  while ((match = thresholdPattern.exec(scoringRule)) !== null) {
    thresholds.push({
      range: match[1],
      points: match[2]
    })
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="font-medium text-blue-800 dark:text-blue-300 text-sm">Graduated Threshold Scoring:</div>

      {thresholds.length > 0 && (
        <div className="space-y-1 ml-2">
          {thresholds.map((threshold, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span className="text-gray-700 dark:text-gray-300">
                {formatThresholdRange(threshold.range)}
                <span className="mx-1.5 text-gray-400 dark:text-gray-500">→</span>
                <span className="font-medium text-blue-700 dark:text-blue-400">{threshold.points} pts</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {condition && (
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            Condition: {condition}{elseCondition ? `, else ${elseCondition}` : ''}
          </span>
        </div>
      )}

      {target && (
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800">
            Target: {target}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Format threshold range for display
 */
function formatThresholdRange(range: string): string {
  if (range.includes('+')) {
    return `${range.replace('+', '')}+ policies`
  } else if (range.includes('-')) {
    return `${range} policies`
  } else if (range === '0') {
    return '0 policies'
  } else if (range === '1') {
    return '1 policy'
  } else {
    return `${range} policies`
  }
}

/**
 * Display for simple formula-based scoring
 */
function SimpleScoringDisplay({
  scoringRule,
  target,
  condition,
  className
}: {
  scoringRule: string
  target: string | null
  condition: string | null
  className?: string
}) {
  // Remove target and condition from the main rule for cleaner display
  let cleanRule = scoringRule
    .replace(/\(?\s*target:\s*[^)]+\)?/gi, '')
    .replace(/\(?\s*if\s+[^)]+\)?/gi, '')
    .trim()

  // Check if it's a formula (contains ×, /, -, etc.)
  const isFormula = /[×\/\-\+]|percentage|delta/i.test(cleanRule)

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn(
        "text-sm",
        isFormula ? "font-mono bg-blue-50/50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-100 dark:border-blue-800" : ""
      )}>
        <span className="font-medium text-blue-800 dark:text-blue-300">Scoring: </span>
        <span className="text-blue-700 dark:text-blue-400">{cleanRule}</span>
      </div>

      {condition && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            Condition: {condition}
          </span>
        </div>
      )}

      {target && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800">
            Target: {target}
          </span>
        </div>
      )}
    </div>
  )
}
