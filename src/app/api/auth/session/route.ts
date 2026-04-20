import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isExtensionMode, getExtensionCredentials } from '@/lib/extension-mode'

/**
 * Custom session endpoint for IP Fabric Extension compatibility
 *
 * Returns session info in both modes:
 * - Extension mode: Returns IP Fabric URL from environment
 * - Standalone mode: Returns NextAuth session
 */
export async function GET(req: NextRequest) {
  try {
    // Check if running as IP Fabric Extension
    if (isExtensionMode(req)) {
      // Extension mode: Return IP Fabric URL with auto-detection
      const creds = getExtensionCredentials(req)

      return NextResponse.json({
        user: {
          apiUrl: creds.apiUrl,
          name: 'IP Fabric User',
          email: 'user@ipfabric',
        }
      })
    }

    // Standalone mode: Use NextAuth session
    const session = await auth()

    if (!session) {
      return NextResponse.json(null)
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json(null, { status: 500 })
  }
}
