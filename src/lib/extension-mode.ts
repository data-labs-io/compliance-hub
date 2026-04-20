/**
 * Extension Mode Detection & Credential Management
 *
 * Handles IP Fabric Extension detection and credential retrieval
 * with support for auto-detection and stored tokens
 */

import { getStoredToken, hasStoredToken } from './token-storage'

/**
 * Extract a cookie value from a request
 */
function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const parts = cookie.trim().split('=')
    if (parts.length >= 2) {
      const key = parts[0]
      const value = parts.slice(1).join('=')
      acc[key] = value
    }
    return acc
  }, {} as Record<string, string>)

  return cookies[name] || null
}

/**
 * Check if running as IP Fabric Extension (server-side)
 *
 * Prioritizes the presence of the accessToken cookie from IP Fabric
 */
export function isExtensionMode(request?: Request): boolean {
  // 1. Primary: Check for accessToken cookie from IP Fabric platform
  if (request) {
    const accessToken = getCookie(request, 'accessToken')
    if (accessToken) return true
  }

  // 2. Secondary: Check for stored token (fallback for existing setup mode)
  // This allows persistent extension tokens if cookie auth is unavailable but we're in extension env
  return hasStoredToken()
}

/**
 * Auto-detect IP Fabric URL from request headers
 */
export function autoDetectApiUrl(request?: Request): string | null {
  if (!request) return null

  try {
    // Try multiple header strategies, prioritizing Origin as per user request
    const origin = request.headers.get('origin')
    if (origin) return origin

    const host =
      request.headers.get('x-forwarded-host') ||
      request.headers.get('x-original-host') ||
      request.headers.get('host')

    if (!host) return null

    // Determine protocol
    const proto =
      request.headers.get('x-forwarded-proto') ||
      request.headers.get('x-forwarded-protocol') ||
      'https'

    // Construct URL
    const url = `${proto}://${host}`

    // Validate it looks like a proper URL
    try {
      new URL(url)
      return url
    } catch {
      return null
    }
  } catch (error) {
    console.error('Error auto-detecting API URL:', error)
    return null
  }
}

/**
 * Get IP Fabric credentials with auto-detection and stored token support
 *
 * Priority order:
 * 1. accessToken cookie (from IP Fabric session)
 * 2. Stored token (from setup page)
 * 3. Environment variables
 * 4. Auto-detected URL (if request provided)
 */
export function getExtensionCredentials(request?: Request) {
  // Get accessToken from cookie if available
  const cookieToken = request ? getCookie(request, 'accessToken') : null

  // Get stored token (from setup page)
  const storedToken = getStoredToken()

  // Auto-detect URL from request if available
  const apiUrl = (request ? autoDetectApiUrl(request) : '') || ''

  // For IP Fabric extensions, if the detected URL matches the instance we are on,
  // we might want to use a more direct internal path if the external one fails.
  // We'll stick to the detected one for now but ensure it's not empty.

  const apiToken = cookieToken || storedToken || ''

  // Log credentials status for production debugging
  console.log('[extension-mode] Credentials check:', {
    hasApiUrl: !!apiUrl,
    apiUrl: apiUrl,
    hasApiToken: !!apiToken,
    tokenType: cookieToken ? 'cookie' : (storedToken ? 'stored' : 'none'),
    isExtension: isExtensionMode(request),
    cookieNames: request ? request.headers.get('cookie')?.split(';').map(c => c.trim().split('=')[0]) : []
  })

  return {
    apiUrl,
    apiToken,
    isAutoDetected: !!apiUrl,
    isCookie: !!cookieToken,
    isStored: !!storedToken,
  }
}

/**
 * Check if extension is configured (has token)
 */
export function isExtensionConfigured(request?: Request): boolean {
  if (request && getCookie(request, 'accessToken')) {
    return true
  }
  return !!getStoredToken()
}

/**
 * Get correct authentication header based on token type
 */
export function getAuthHeader(apiToken: string, isCookie: boolean): Record<string, string> {
  if (isCookie) {
    // Session token from cookie should be sent as Bearer token
    return { 'Authorization': `Bearer ${apiToken}` }
  } else {
    // Standard API token
    return { 'X-API-Token': apiToken }
  }
}
