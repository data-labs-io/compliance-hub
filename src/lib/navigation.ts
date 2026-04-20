/**
 * Navigation Helper for IP Fabric Extension
 */
import { getApiBasePath } from './api-path'

export function getNavigationPath(path: string): string {
  const basePath = getApiBasePath()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // Combine prefix and path
  return `${basePath}${normalizedPath}`
}

export function useNavigationPath() {
  return {
    push: (path: string) => getNavigationPath(path),
    getPath: getNavigationPath,
  }
}
