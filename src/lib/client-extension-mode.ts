/**
 * Client-side Extension Mode Detection
 *
 * Detects if running as IP Fabric Extension based on browser URL
 */

/**
 * Check if running as IP Fabric Extension (client-side)
 * Detects based on URL path pattern
 */
export function isClientExtensionMode(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const pathname = window.location.pathname

  // Check if URL contains extension path pattern
  return pathname.includes('/extensions-apps/')
}

/**
 * Get extension slug from URL
 */
export function getExtensionSlug(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const pathname = window.location.pathname
  const match = pathname.match(/\/extensions-apps\/([^\/]+)/)

  return match ? match[1] : null
}
