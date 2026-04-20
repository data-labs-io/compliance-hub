import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { decryptApiKey } from '@/lib/auth'

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
    // Check authentication - ALWAYS REQUIRED
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting
    const identifier = session.user.email || 'anonymous'
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
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
    const apiKey = decryptApiKey(encryptedApiKey)
    const apiUrl = session.user.apiUrl

    // Extract path from URL - now using [...path] dynamic route
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').slice(4) // Remove /api/ipfabric/proxy
    const ipFabricPath = pathSegments.join('/')

    // Debug logging
    console.log('[Proxy] Request path:', ipFabricPath)
    console.log('[Proxy] Snapshot ID:', url.searchParams.get('snapshotId'))

    // Get snapshot ID from query parameters (default to $last if not provided)
    const snapshotId = url.searchParams.get('snapshotId') || '$last'

    // Construct full IP Fabric URL - use v7.3 for latest features
    let ipFabricUrl = `${apiUrl}/api/v7.3/${ipFabricPath}`

    // For non-POST requests or non-tables endpoints, add query params
    // For tables API endpoints with POST, snapshot goes in the body
    if (method === 'GET' || !ipFabricPath.startsWith('tables/')) {
      // For GET requests, include all query params
      ipFabricUrl += url.search
    } else {
      // For POST to tables API, don't include snapshotId in URL (it goes in body)
      const searchParams = new URLSearchParams(url.search)
      searchParams.delete('snapshotId')
      const queryString = searchParams.toString()
      if (queryString) {
        ipFabricUrl += `?${queryString}`
      }
    }

    // Prepare headers
    const headers: HeadersInit = {
      'X-API-Token': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
    }

    // Add body for POST/PUT/PATCH requests
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
              requestOptions.body = JSON.stringify(bodyJson)
            } catch {
              // If body is not JSON or parsing fails, use as-is
              requestOptions.body = body
            }
          } else {
            requestOptions.body = body
          }
        }
      } catch {
        // No body or invalid body
      }
    }

    // Forward request to IP Fabric
    console.log('[Proxy] Calling IP Fabric:', ipFabricUrl)
    const response = await fetch(ipFabricUrl, requestOptions)
    console.log('[Proxy] Response status:', response.status)

    // Get response data
    let data
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      data = await response.json()
      console.log('[Proxy] Response data keys:', data ? Object.keys(data) : 'null')
    } else {
      data = await response.text()
      console.log('[Proxy] Response text:', data?.substring(0, 100))
    }

    // Handle response
    if (response.ok) {
      // Add cache headers for successful GET requests
      if (method === 'GET') {
        const headers = new Headers()
        headers.set('Cache-Control', 'private, max-age=300') // 5 minutes

        return NextResponse.json(data, {
          status: response.status,
          headers
        })
      }

      return NextResponse.json(data, { status: response.status })
    }

    // Handle error responses
    return NextResponse.json(
      data || { error: 'Request failed' },
      { status: response.status }
    )

  } catch (error) {
    console.error('IP Fabric proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}