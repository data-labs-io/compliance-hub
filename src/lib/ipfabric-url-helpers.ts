/**
 * IP Fabric URL Helper Functions
 *
 * Utilities for constructing deep links to IP Fabric GUI
 */

/**
 * Convert GUI path format to IP Fabric URL format
 *
 * Examples:
 * - "Technology/Security/Access List" → "/technology/security/access-list"
 * - "Inventory/Devices" → "/inventory/devices"
 * - "Technology/Management/Telnet access" → "/technology/management/telnet-access"
 *
 * @param guiPath - User-friendly GUI path with capitals and spaces
 * @returns URL-friendly path (lowercase, dash-separated)
 */
export function convertGuiPathToUrl(guiPath: string): string {
  return '/' + guiPath
    .split('/')
    .map(segment => segment.toLowerCase().replace(/\s+/g, '-'))
    .join('/')
}

/**
 * Build full IP Fabric GUI URL with snapshot parameter
 *
 * @param baseUrl - IP Fabric instance URL (e.g., "https://marketing.ipf.cx")
 * @param guiPath - GUI path from control description (e.g., "Technology/Security/Access List")
 * @param snapshotId - Snapshot ID to view (e.g., "abc123-def456")
 * @returns Full URL to IP Fabric GUI location
 */
export function buildIPFabricGuiUrl(
  baseUrl: string,
  guiPath: string,
  snapshotId: string
): string {
  const urlPath = convertGuiPathToUrl(guiPath)
  return `${baseUrl}${urlPath}?selectSnapshot=${snapshotId}`
}

/**
 * Build IP Fabric URL from a direct path (no conversion needed)
 *
 * @param baseUrl - IP Fabric instance URL (e.g., "https://marketing.ipf.cx")
 * @param path - Direct path (e.g., "/technology/security/acl")
 * @param snapshotId - Snapshot ID to view
 * @returns Full URL to IP Fabric GUI location
 */
export function buildIPFabricUrl(
  baseUrl: string,
  path: string,
  snapshotId: string
): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}?selectSnapshot=${snapshotId}`
}
