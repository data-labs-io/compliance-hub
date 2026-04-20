'use client'

import { useEffect } from 'react'
import { useDashboardStore } from '@/stores/dashboard-store'

/**
 * Hook to manage colorblind mode state and apply the CSS class to the body.
 *
 * Usage:
 * ```tsx
 * const { isColorBlindMode, setColorBlindMode } = useColorBlindMode()
 *
 * // Check mode in component
 * if (isColorBlindMode) {
 *   // Show icons alongside colors
 * }
 * ```
 */
export function useColorBlindMode() {
  const colorBlindMode = useDashboardStore((state) => state.colorBlindMode)
  const setColorBlindMode = useDashboardStore((state) => state.setColorBlindMode)

  // Apply/remove the colorblind-mode class on the body element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (colorBlindMode) {
        document.body.classList.add('colorblind-mode')
      } else {
        document.body.classList.remove('colorblind-mode')
      }
    }
    // No cleanup - class should persist as long as the setting is true
    // Multiple components use this hook, so we don't want to remove
    // the class when any one of them unmounts
  }, [colorBlindMode])

  return {
    isColorBlindMode: colorBlindMode,
    setColorBlindMode,
  }
}
