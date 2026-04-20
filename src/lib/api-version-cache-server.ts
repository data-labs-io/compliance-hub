/**
 * Server-Side API Version Cache
 *
 * Caches the discovered IP Fabric API version on the server to avoid repeated version probing.
 * Uses in-memory storage since server-side cannot access localStorage.
 *
 * This is used by the proxy route to remember which API version works for each instance.
 *
 * Benefits:
 * - Eliminates repeated version probing for proxy requests
 * - Reduces unnecessary API calls and latency
 * - Instance-specific caching (supports multiple IP Fabric instances)
 *
 * Usage:
 * ```typescript
 * import { serverVersionCache } from '@/lib/api-version-cache-server'
 *
 * // Try cached version first
 * const cachedVersion = serverVersionCache.get(instanceUrl)
 *
 * // Store successful version
 * if (response.ok) {
 *   serverVersionCache.set('v7.3', instanceUrl)
 * }
 *
 * // Clear cache on errors
 * if (response.status === 410) {
 *   serverVersionCache.invalidate(instanceUrl)
 * }
 * ```
 */

interface VersionCacheEntry {
  version: string
  timestamp: number
}

// In-memory cache - stores discovered version per IP Fabric instance URL
const versionCache = new Map<string, VersionCacheEntry>()

// Cache TTL: 1 hour (server restarts will clear the cache)
const CACHE_TTL = 60 * 60 * 1000

export const serverVersionCache = {
  /**
   * Get cached API version for the given instance URL
   * Returns null if cache miss or expired
   */
  get(instanceUrl: string): string | null {
    const entry = versionCache.get(instanceUrl)
    if (!entry) return null

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      versionCache.delete(instanceUrl)
      console.log(`[ServerVersionCache] Cache expired for ${instanceUrl}`)
      return null
    }

    console.log(`[ServerVersionCache] Hit: ${entry.version} for ${instanceUrl}`)
    return entry.version
  },

  /**
   * Store successful API version in cache
   */
  set(version: string, instanceUrl: string): void {
    versionCache.set(instanceUrl, {
      version,
      timestamp: Date.now()
    })
    console.log(`[ServerVersionCache] Stored: ${version} for ${instanceUrl}`)
  },

  /**
   * Invalidate cache for a specific instance
   * Used when cached version fails (404/410 errors)
   */
  invalidate(instanceUrl: string): void {
    versionCache.delete(instanceUrl)
    console.log(`[ServerVersionCache] Invalidated for ${instanceUrl}`)
  },

  /**
   * Clear all cached versions
   */
  clear(): void {
    versionCache.clear()
    console.log('[ServerVersionCache] Cleared all entries')
  }
}
