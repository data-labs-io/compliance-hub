import { NextRequest, NextResponse } from 'next/server'
import { isExtensionMode, isExtensionConfigured } from '@/lib/extension-mode'

/**
 * Check setup status endpoint
 *
 * Returns whether extension needs setup
 */
export async function GET(req: NextRequest) {
  try {
    const extensionMode = isExtensionMode(req)
    const configured = isExtensionConfigured(req)

    return NextResponse.json({
      isExtensionMode: extensionMode,
      needsSetup: extensionMode && !configured,
      configured,
    })
  } catch (error) {
    console.error('Setup status check error:', error)
    return NextResponse.json(
      {
        isExtensionMode: false,
        needsSetup: false,
        configured: false,
      },
      { status: 500 }
    )
  }
}
