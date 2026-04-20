/**
 * Rate-Limited Fetch Utility
 *
 * Provides rate-limited fetch for non-hook contexts (stores, utilities).
 * For React components/hooks, prefer useIPFabricAPICall() which has
 * additional features like snapshot context and retry logic.
 */

import { rateLimiter } from './rate-limiter'
import { getApiPath } from './api-path'

/**
 * Rate-limited fetch for IP Fabric API calls
 *
 * @param path - API path (will be prefixed with extension path if needed)
 * @param options - Standard fetch options
 * @param groupId - Optional group ID for bulk abort (e.g., framework switch)
 * @returns Promise<Response>
 */
export async function rateLimitedFetch(
  path: string,
  options?: RequestInit,
  groupId?: string
): Promise<Response> {
  const fullPath = getApiPath(path)
  return rateLimiter.enqueue(() => fetch(fullPath, options), groupId)
}

/**
 * Rate-limited fetch that returns JSON directly
 * Convenience wrapper for common use case
 */
export async function rateLimitedFetchJson<T = any>(
  path: string,
  options?: RequestInit,
  groupId?: string
): Promise<T> {
  const response = await rateLimitedFetch(path, options, groupId)
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }
  return response.json()
}
