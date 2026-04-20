'use client'

/**
 * DeltaBasedTooltip Component
 *
 * Provides explanatory tooltip content for delta-based controls that require
 * snapshot comparison for accurate scoring.
 */

export function DeltaBasedTooltip() {
  return (
    <div className="text-xs max-w-xs">
      <p className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Delta-Based Scoring</p>
      <p className="text-gray-600 dark:text-gray-300 mb-2">
        This control&apos;s score is calculated by comparing changes between snapshots.
      </p>
      <p className="text-gray-600 dark:text-gray-300 mb-2">
        <strong>To see accurate scores:</strong> Enable snapshot comparison by selecting a previous snapshot to compare against.
      </p>
      <p className="text-gray-500 dark:text-gray-400 text-[10px]">
        Without comparison, scores shown may not reflect actual compliance status.
      </p>
    </div>
  )
}
