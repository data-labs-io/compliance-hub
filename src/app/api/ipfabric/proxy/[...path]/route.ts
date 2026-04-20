import { NextRequest, NextResponse } from 'next/server'
import { auth, decryptApiKey } from '@/lib/auth'
import { isExtensionMode, getExtensionCredentials, getAuthHeader } from '@/lib/extension-mode'
import { serverVersionCache } from '@/lib/api-version-cache-server'

// Supported API versions in order of preference (newest to oldest)
const API_VERSIONS = ['', 'v7.8', 'v7.7', 'v7.6', 'v7.5', 'v7.4', 'v7.3', 'v7.2', 'v7.1', 'v7.0', 'v6.9', 'v6.8', 'v6.7', 'v6.6', 'v6.5', 'v6.4', 'v6.3']

// Rate limiting - simple in-memory store (consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimitStore.get(identifier)

  if (!userLimit || userLimit.resetTime < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (userLimit.count >= limit) {
    return false
  }

  userLimit.count++
  return true
}

export async function GET(req: NextRequest) {
  return handleRequest(req, 'GET')
}

export async function POST(req: NextRequest) {
  return handleRequest(req, 'POST')
}

export async function PUT(req: NextRequest) {
  return handleRequest(req, 'PUT')
}

export async function DELETE(req: NextRequest) {
  return handleRequest(req, 'DELETE')
}

export async function PATCH(req: NextRequest) {
  return handleRequest(req, 'PATCH')
}

async function handleRequest(req: NextRequest, method: string) {
  try {
    let apiUrl: string
    let apiKey: string
    let identifier: string

    let isCookieToken = false

    // Check if running as IP Fabric Extension
    if (isExtensionMode(req)) {
      // Extension mode: Use IP Fabric provided credentials with auto-detection
      const creds = getExtensionCredentials(req)
      isCookieToken = creds.isCookie
      if (!creds.apiUrl || !creds.apiToken) {
        return NextResponse.json(
          { error: 'Extension not configured. Please complete setup.' },
          { status: 401 }
        )
      }
      apiUrl = creds.apiUrl.replace(/\/$/, '')
      apiKey = creds.apiToken
      identifier = 'extension-user'

      if (creds.isAutoDetected) {
        console.log('Extension mode: Auto-detected IP Fabric URL from request')
      }
      if (creds.isStored) {
        console.log('Extension mode: Using stored token from setup')
      }
      console.log('Extension mode: Using IP Fabric credentials -', apiUrl)
    } else {
      // Standalone mode: Use NextAuth session
      const session = await auth()
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Get encrypted API key from session
      const encryptedApiKey = session.user.apiKey
      if (!encryptedApiKey) {
        return NextResponse.json(
          { error: 'API key not configured' },
          { status: 400 }
        )
      }

      // Decrypt API key
      apiKey = decryptApiKey(encryptedApiKey)
      apiUrl = session.user.apiUrl?.replace(/\/$/, '') || ''
      identifier = session.user.email || 'anonymous'
    }

    // Rate limiting
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Extract path from URL - now using [...path] dynamic route
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').slice(4) // Remove /api/ipfabric/proxy
    const ipFabricPath = pathSegments.join('/')

    // Get snapshot ID from query parameters (default to $last if not provided)
    const snapshotId = url.searchParams.get('snapshotId') || '$last'

    // Build query string for URL
    let queryString = ''
    if (method === 'GET' || !ipFabricPath.startsWith('tables/')) {
      // For GET requests, include all query params
      queryString = url.search
    } else {
      // For POST to tables API, don't include snapshotId in URL (it goes in body)
      const searchParams = new URLSearchParams(url.search)
      searchParams.delete('snapshotId')
      const qs = searchParams.toString()
      if (qs) {
        queryString = `?${qs}`
      }
    }

    // Prepare headers
    const headers: HeadersInit = {
      ...getAuthHeader(apiKey, isCookieToken),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    // Get request body for POST/PUT/PATCH
    let requestBody: string | undefined
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        let body = await req.text()
        if (body) {
          // For tables API endpoints, ensure snapshot is in the body
          if (ipFabricPath.startsWith('tables/') && snapshotId) {
            try {
              const bodyJson = JSON.parse(body)
              // Add snapshot to body if not already present
              if (!bodyJson.snapshot) {
                bodyJson.snapshot = snapshotId
              }
              requestBody = JSON.stringify(bodyJson)
            } catch {
              // If body is not JSON or parsing fails, use as-is
              requestBody = body
            }
          } else {
            requestBody = body
          }
        }
      } catch {
        // No body or invalid body
      }
    }

    // Build list of versions to try - cached version first, then fallback list
    const cachedVersion = serverVersionCache.get(apiUrl)
    const versionsToTry = cachedVersion
      ? [cachedVersion, ...API_VERSIONS.filter(v => v !== cachedVersion)]
      : [...API_VERSIONS]

    // Try each API version until one works
    let lastError: { data: any; status: number } | null = null

    for (const version of versionsToTry) {
      const versionPart = version ? `${version}/` : ''
      const ipFabricUrl = `${apiUrl}/api/${versionPart}${ipFabricPath}${queryString}`

      const requestOptions: RequestInit = {
        method,
        headers,
      }
      if (requestBody) {
        requestOptions.body = requestBody
      }

      // Forward request to IP Fabric
      const response = await fetch(ipFabricUrl, requestOptions)

      // Get response data
      let data
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      // Check for version mismatch error
      if (data?.code === 'API_UNSUPPORTED_VERSION') {
        console.log(`[Proxy] API version ${version} not supported for ${apiUrl}`)

        // If server suggests a specific version, try it next
        const recommendedVersion = data.data?.apiVersion
        if (recommendedVersion && !versionsToTry.includes(recommendedVersion)) {
          console.log(`[Proxy] Server recommends version ${recommendedVersion}`)
          // Insert recommended version at the front for next iteration
          versionsToTry.splice(versionsToTry.indexOf(version) + 1, 0, recommendedVersion)
        }

        // Invalidate cached version if it failed
        if (version === cachedVersion) {
          serverVersionCache.invalidate(apiUrl)
        }

        lastError = { data, status: response.status }
        continue // Try next version
      }

      // Handle successful response
      if (response.ok) {
        // Cache the successful version
        if (version !== cachedVersion) {
          serverVersionCache.set(version, apiUrl)
        }

        // Add cache headers for successful GET requests
        if (method === 'GET') {
          const responseHeaders = new Headers()
          responseHeaders.set('Cache-Control', 'private, max-age=300') // 5 minutes
          return NextResponse.json(data, { status: response.status, headers: responseHeaders })
        }

        return NextResponse.json(data, { status: response.status })
      }

      // For other errors (not version mismatch), return immediately
      // Don't try other versions for auth errors, not found, etc.
      return NextResponse.json(data || { error: 'Request failed' }, { status: response.status })
    }

    // All versions failed - return the last error
    return NextResponse.json(
      lastError?.data || { error: 'All API versions failed' },
      { status: lastError?.status || 500 }
    )

  } catch (error) {
    console.error('IP Fabric proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}