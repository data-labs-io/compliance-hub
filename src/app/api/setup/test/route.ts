import { NextRequest, NextResponse } from 'next/server'
import { autoDetectApiUrl } from '@/lib/extension-mode'

/**
 * Test API connection endpoint
 *
 * Validates API token and returns detected IP Fabric URL
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token || typeof token !== 'string' || token.trim() === '') {
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400 }
      )
    }

    // Auto-detect IP Fabric URL from request
    const apiUrl = autoDetectApiUrl(req)

    if (!apiUrl) {
      return NextResponse.json(
        { error: 'Could not detect IP Fabric URL from request' },
        { status: 400 }
      )
    }

    // Test the connection by fetching snapshots
    const response = await fetch(`${apiUrl}/api/v7.0/snapshots`, {
      headers: {
        'X-API-Token': token.trim(),
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'Invalid API token or insufficient permissions' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: `IP Fabric API returned error: ${response.status}` },
        { status: response.status }
      )
    }

    // Connection successful
    const data = await response.json()

    return NextResponse.json({
      success: true,
      apiUrl,
      snapshotCount: data?.length || 0,
      message: 'Connection successful',
    })
  } catch (error) {
    console.error('Setup test error:', error)
    return NextResponse.json(
      {
        error: 'Failed to test connection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
