/**
 * API Version Cache
 *
 * Caches the discovered IP Fabric API version to avoid repeated version probing.
 * The cache is stored in localStorage with a 24-hour TTL and is instance-specific.
 *
 * Benefits:
 * - Eliminates 5-30 second version probing delay on subsequent page loads
 * - Reduces unnecessary API calls
 * - Automatically invalidates on errors (404/410)
 *
 * Usage:
 * ```typescript
 * import { apiVersionCache } from '@/lib/api-version-cache'
 *
 * // Try cached version first
 * const cachedVersion = apiVersionCache.get(instanceUrl)
 *
 * // Store successful version
 * if (response.ok) {
 *   apiVersionCache.set('v7.0', instanceUrl)
 * }
 *
 * // Clear cache on errors
 * if (response.status === 410) {
 *   apiVersionCache.invalidate()
 * }
 * ```
 */

interface VersionCacheEntry {
  version: string
  timestamp: number
  instanceUrl: string
}

const CACHE_KEY = 'ipfabric_api_version'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export const apiVersionCache = {
  /**
   * Get cached API version for the given instance URL
   * Returns null if cache miss, expired, or different instance
   */
  get(instanceUrl: string): string | null {
    // Server-side: no localStorage available
    if (typeof window === 'undefined') return null

    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null

      const entry: VersionCacheEntry = JSON.parse(cached)

      // Validate: correct instance + not expired
      if (entry.instanceUrl !== instanceUrl) {
        console.log('[VersionCache] Instance URL mismatch, invalidating cache')
        return null
      }

      if (Date.now() - entry.timestamp > CACHE_TTL) {
        console.log('[VersionCache] Cache expired, invalidating')
        return null
      }

      console.log(`[VersionCache] Hit: ${entry.version} for ${instanceUrl}`)
      return entry.version
    } catch (e) {
      console.error('[VersionCache] Error reading cache:', e)
      return null
    }
  },

  /**
   * Store successful API version in cache
   */
  set(version: string, instanceUrl: string): void {
    // Server-side: no localStorage available
    if (typeof window === 'undefined') return

    try {
      const entry: VersionCacheEntry = {
        version,
        timestamp: Date.now(),
        instanceUrl
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
      console.log(`[VersionCache] Stored: ${version} for ${instanceUrl}`)
    } catch (e) {
      console.error('[VersionCache] Error writing cache:', e)
    }
  },

  /**
   * Clear cached version
   */
  clear(): void {
    // Server-side: no localStorage available
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(CACHE_KEY)
      console.log('[VersionCache] Cleared')
    } catch (e) {
      console.error('[VersionCache] Error clearing cache:', e)
    }
  },

  /**
   * Invalidate cache (same as clear, but semantically different)
   * Used when cached version fails (404/410 errors)
   */
  invalidate(): void {
    // Server-side: no localStorage available
    if (typeof window === 'undefined') return

    this.clear()
    console.log('[VersionCache] Invalidated due to error')
  }
}
