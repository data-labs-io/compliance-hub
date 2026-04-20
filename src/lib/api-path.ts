/**
 * API Path Helper for IP Fabric Extension
 */

export function getApiBasePath(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  // If we are in extension mode (checked via URL), return the prefix
  if (window.location.pathname.includes('/extensions-apps/')) {
    const match = window.location.pathname.match(/^(\/extensions-apps\/[^\/]+)/)
    return match ? match[1] : ''
  }

  return ''
}

export function getApiPath(path: string): string {
  const basePath = getApiBasePath()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${basePath}${normalizedPath}`
}

/**
 * Wrapper for fetch that automatically prefixes API calls
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const fullPath = getApiPath(path)
  return fetch(fullPath, options)
}
