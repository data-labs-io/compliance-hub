import { NextRequest, NextResponse } from 'next/server'
import { saveToken } from '@/lib/token-storage'
import { autoDetectApiUrl } from '@/lib/extension-mode'

/**
 * Save API token endpoint
 *
 * Saves the validated token to secure storage
 */
export async function POST(req: NextRequest) {
  try {
    console.log('=== SETUP SAVE API ===')

    const { token } = await req.json()
    console.log('Received token, length:', token?.length || 0)

    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('Invalid token provided')
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400 }
      )
    }

    // Auto-detect IP Fabric URL
    const apiUrl = autoDetectApiUrl(req)
    console.log('Auto-detected URL:', apiUrl)

    if (!apiUrl) {
      console.error('Could not detect IP Fabric URL from request')
      return NextResponse.json(
        { error: 'Could not detect IP Fabric URL' },
        { status: 400 }
      )
    }

    // Test connection first before saving
    console.log('Testing connection to:', apiUrl)
    try {
      const testResponse = await fetch(`${apiUrl}/api/v7.0/snapshots`, {
        headers: {
          'X-API-Token': token.trim(),
          'Content-Type': 'application/json',
        },
      })

      console.log('Test response status:', testResponse.status)

      if (!testResponse.ok) {
        console.error('Token verification failed:', testResponse.status)
        return NextResponse.json(
          {
            error:
              testResponse.status === 401 || testResponse.status === 403
                ? 'Invalid API token'
                : 'Failed to verify token',
          },
          { status: 401 }
        )
      }
      console.log('Token verification successful')
    } catch (verifyError) {
      console.error('Token verification error:', verifyError)
      return NextResponse.json(
        { error: 'Failed to verify token with IP Fabric' },
        { status: 500 }
      )
    }

    // Save the token
    console.log('Attempting to save token...')
    const saved = saveToken(token.trim())
    console.log('Token save result:', saved)

    if (!saved) {
      console.error('Token save returned false')
      return NextResponse.json(
        { error: 'Failed to save token to storage. Check server logs for details.' },
        { status: 500 }
      )
    }

    console.log('Token saved successfully!')
    return NextResponse.json({
      success: true,
      message: 'Token saved successfully',
      apiUrl,
    })
  } catch (error) {
    console.error('Setup save error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      {
        error: 'Failed to save token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
