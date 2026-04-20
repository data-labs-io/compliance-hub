import { NextRequest, NextResponse } from 'next/server'
import { auth, decryptApiKey } from '@/lib/auth'
import { isExtensionMode, getExtensionCredentials, getAuthHeader } from '@/lib/extension-mode'
import { apiVersionCache } from '@/lib/api-version-cache'

export async function GET(req: NextRequest) {
  try {
    let apiUrl: string
    let apiKey: string

    let isCookieToken = false

    console.log('=== SNAPSHOTS API DEBUG ===')
    console.log('Extension mode check:', isExtensionMode(req))

    // Check if running as IP Fabric Extension
    if (isExtensionMode(req)) {
      // Extension mode: Use IP Fabric provided credentials with auto-detection
      const creds = getExtensionCredentials(req)
      isCookieToken = creds.isCookie

      console.log('Extension mode detected')
      console.log('Auto-detected URL:', creds.isAutoDetected)
      console.log('Stored token:', creds.isStored)
      console.log('Has API URL:', !!creds.apiUrl)
      console.log('Has API Token:', !!creds.apiToken, '(length:', creds.apiToken?.length || 0, ')')

      // Early check for missing credentials before any string operations
      if (!creds.apiUrl || !creds.apiToken) {
        console.error('[snapshots] Missing credentials! URL:', !!creds.apiUrl, 'Token:', !!creds.apiToken)
        return NextResponse.json(
          { error: 'Extension not configured. Please complete setup.' },
          { status: 401 }
        )
      }

      apiUrl = creds.apiUrl.replace(/\/$/, '')
      apiKey = creds.apiToken

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
      console.log('Standalone mode - Session check:', !!session, 'User:', !!session?.user)

      if (!session?.user) {
        console.error('No session or user found')
        return NextResponse.json(
          { error: 'Unauthorized - No session found' },
          { status: 401 }
        )
      }

      // Get encrypted API key from session
      const encryptedApiKey = session.user.apiKey
      if (!encryptedApiKey) {
        console.error('No API key in session:', session.user)
        return NextResponse.json(
          { error: 'API key not configured in session' },
          { status: 400 }
        )
      }

      // Decrypt API key
      apiKey = decryptApiKey(encryptedApiKey)
      apiUrl = session.user.apiUrl?.replace(/\/$/, '') || ''
    }

    console.log('Using IP Fabric instance:', apiUrl)

    // No special handling for marketing.ipf.cx - treat it like any other instance
    // It will use the standard API endpoints below

    // Always connect to real IP Fabric instances
    let snapshots = []

    try {
      // Add overall timeout for snapshot fetching (30 seconds total)
      const overallController = new AbortController()
      const overallTimeoutId = setTimeout(() => overallController.abort(), 30000)

      // Try cached API version first, then fall back to probing
      const cachedVersion = apiVersionCache.get(apiUrl)
      const versions = cachedVersion
        ? [cachedVersion, '', 'v7.8', 'v7.7', 'v7.6', 'v7.5', 'v7.4', 'v7.3', 'v7.2', 'v7.1', 'v7.0', 'v6.9', 'v6.8', 'v6.7', 'v6.6', 'v6.5', 'v6.4', 'v6.3'].filter((v, i, arr) => arr.indexOf(v) === i)
        : ['', 'v7.8', 'v7.7', 'v7.6', 'v7.5', 'v7.4', 'v7.3', 'v7.2', 'v7.1', 'v7.0', 'v6.9', 'v6.8', 'v6.7', 'v6.6', 'v6.5', 'v6.4', 'v6.3']

      let response: Response | null = null
      let lastErrorData = null
      let successfulVersion: string | null = null  // Track which version succeeded

      for (const version of versions) {
        const snapshotsUrl = version ? `${apiUrl}/api/${version}/snapshots` : `${apiUrl}/api/snapshots`
        console.log(`[snapshots] Trying ${version ? 'version ' + version : 'versionless'} at: ${snapshotsUrl}`)

        // Add per-request timeout (3 seconds each for faster probing)
        const requestController = new AbortController()
        const requestTimeoutId = setTimeout(() => {
          console.warn(`[snapshots] Version ${version} request timed out after 3s`)
          requestController.abort()
        }, 3000)

        try {
          response = await fetch(snapshotsUrl, {
            headers: {
              ...getAuthHeader(apiKey, isCookieToken),
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            signal: requestController.signal
          })

          clearTimeout(requestTimeoutId)
          console.log(`[snapshots] Version ${version} response status: ${response.status}`)
        } catch (fetchError: any) {
          clearTimeout(requestTimeoutId)
          if (fetchError.name === 'AbortError') {
            console.log(`[snapshots] Fetch to ${version} aborted (timeout)`)
          } else {
            console.error(`[snapshots] Fetch to ${version} failed:`, fetchError.message || fetchError)
          }
          continue
        }

        if (response.ok) {
          console.log(`[snapshots] Successfully connected using version: ${version}`)
          successfulVersion = version  // Track successful version for caching
          break
        } else if (response.status === 410) {
          // Parse the error to get the required API version
          try {
            const errorText = await response.text()
            const errorData = JSON.parse(errorText)
            console.log('[snapshots] API version 410 error:', errorData)
            if (errorData.data?.apiVersion) {
              const recommendedVersion = errorData.data.apiVersion
              console.log(`[snapshots] Instance RECOMMENDS version: ${recommendedVersion}`)

              const recommendedUrl = `${apiUrl}/api/${recommendedVersion}/snapshots`
              const recController = new AbortController()
              const recTimeoutId = setTimeout(() => recController.abort(), 5000)

              try {
                const recommendedResponse = await fetch(recommendedUrl, {
                  headers: {
                    'X-API-Token': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  signal: recController.signal
                })

                clearTimeout(recTimeoutId)

                if (recommendedResponse.ok) {
                  console.log(`[snapshots] Success with RECOMMENDED version ${recommendedVersion}`)
                  response = recommendedResponse
                  successfulVersion = recommendedVersion
                  break
                }
              } catch (recError) {
                clearTimeout(recTimeoutId)
                console.log('[snapshots] Recommended version probe failed:', recError)
              }
            }
            lastErrorData = errorData
          } catch (e) {
            console.error('[snapshots] Error parsing 410 response:', e)
          }
        }
        else if (response.status === 404) {
          // 404 means this version doesn't exist - invalidate cache if this was the cached version
          if (cachedVersion === version) {
            console.log(`Cached version ${version} returned 404, invalidating cache`)
            apiVersionCache.invalidate()
          }
        } else if (response.status !== 404) {
          console.log(`Snapshots API ${version} failed with status:`, response.status)
        }
      }

      clearTimeout(overallTimeoutId)

      if (response && response.ok) {
        // Cache the successful API version for future requests
        if (successfulVersion) {
          apiVersionCache.set(successfulVersion, apiUrl)
        }

        const data = await response.json()
        console.log('Snapshots data received:', data)
        snapshots = data.data || data

        // Process snapshots to ensure proper formatting
        snapshots = snapshots.map((snapshot: any) => {
          // IP Fabric returns timestamps in tsEnd or tsStart fields (milliseconds)
          const timestamp = snapshot.tsEnd || snapshot.tsStart || snapshot.createdAt || snapshot.ts || Date.now()

          // Convert timestamp to ISO string if it's a number
          const createdAt = typeof timestamp === 'number'
            ? new Date(timestamp).toISOString()
            : timestamp


          const processedSnapshot = {
            // Ensure we have an ID - use $last for the latest, or the snapshot ID
            id: snapshot.id || snapshot.snapshotId || snapshot['$oid'],
            // Parse the name properly
            name: snapshot.name || 'Unnamed Snapshot',
            // Use the correct timestamp
            createdAt: createdAt,
            // Note field
            note: snapshot.note || '',
            // State field - IP Fabric might use 'status' instead
            state: snapshot.state || snapshot.status || 'unloaded',
            // Locked status
            locked: snapshot.locked || false,
            // Version info
            version: snapshot.version || snapshot.initialVersion || ''
          }

          // Don't set names here - we'll do it after sorting by date
          // Just preserve the original name for now

          // Remove any "Marketing" version labels
          if (processedSnapshot.version === 'Marketing') {
            processedSnapshot.version = ''
          }

          return processedSnapshot
        })

        // Remove duplicates based on ID
        const uniqueSnapshots = new Map()
        snapshots.forEach((snapshot: any) => {
          if (!uniqueSnapshots.has(snapshot.id)) {
            uniqueSnapshots.set(snapshot.id, snapshot)
          }
        })
        snapshots = Array.from(uniqueSnapshots.values())

        // Sort snapshots by date to find the most recent
        // Use stable sort with ID as tiebreaker to ensure consistent ordering
        // when multiple snapshots have identical timestamps
        snapshots.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()

          // Primary sort: by timestamp (most recent first)
          if (dateB !== dateA) {
            return dateB - dateA
          }

          // Secondary sort: by ID (stable, deterministic tiebreaker)
          // This ensures the same snapshot is always index 0 when timestamps are equal
          return a.id.localeCompare(b.id)
        })

        // Add display names for UI without mutating original names
        snapshots = snapshots.map((snapshot: any) => {
          // Preserve original name from IP Fabric (immutable)
          // Use actual snapshot name for all snapshots instead of generic labels

          // Use original name if meaningful
          if (snapshot.name &&
            snapshot.name !== '' &&
            snapshot.name !== 'Unnamed Snapshot' &&
            snapshot.name !== snapshot.id) {
            snapshot.displayName = snapshot.name  // Use original name (e.g., "v7.5.0-40")
          } else {
            // Fallback: use timestamp-based name if no meaningful name exists
            const date = new Date(snapshot.createdAt)
            snapshot.displayName = `Snapshot ${date.toLocaleDateString()}`
          }

          // IMPORTANT: Keep the original state and name from the API - don't override them
          // IP Fabric can have multiple loaded snapshots
          // Both state and name fields contain the correct values from the API

          return snapshot
        })

        console.log('Processed snapshots:', snapshots)
      } else if (response && (response.status === 404 || response.status === 410)) {
        // If standard endpoint doesn't work, try the table endpoint
        console.log('Standard endpoint failed, trying table endpoint')

        // Try newest table endpoint first for newer instances
        const tableVersions = ['', 'v7.8', 'v7.7', 'v7.6', 'v7.5', 'v7.4', 'v7.3', 'v7.2', 'v7.1', 'v7.0', 'v6.9', 'v6.8', 'v6.7']

        for (const tableVersion of tableVersions) {
          const tableUrl = tableVersion ? `${apiUrl}/api/${tableVersion}/tables/management/snapshots` : `${apiUrl}/api/tables/management/snapshots`
          console.log('Trying table endpoint:', tableUrl)

          // Add timeout to table endpoint requests
          const tableController = new AbortController()
          const tableTimeoutId = setTimeout(() => tableController.abort(), 5000)

          try {
            const tableResponse = await fetch(tableUrl, {
              method: 'POST',
              headers: {
                ...getAuthHeader(apiKey, isCookieToken),
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                columns: ['id', 'name', 'note', 'createdAt', 'state', 'locked', 'version'],
                filters: {},
                pagination: { limit: 50, start: 0 },
                sort: { order: 'desc', column: 'createdAt' }
              }),
              signal: tableController.signal
            })

            clearTimeout(tableTimeoutId)

            if (tableResponse.ok) {
              const tableData = await tableResponse.json()
              console.log('Table endpoint successful with version:', tableVersion)
              snapshots = tableData.data || []
              break
            } else {
              console.log(`Table endpoint ${tableVersion} failed:`, tableResponse.status)
            }
          } catch (tableError) {
            clearTimeout(tableTimeoutId)
            console.log(`Table endpoint ${tableVersion} timeout/error:`, tableError)
          }
        }

        clearTimeout(overallTimeoutId)

        if (snapshots.length === 0) {
          console.error('All table endpoints failed')
        }
      } else if (response) {
        console.error('Snapshots API failed:', response.status, await response.text())
      } else {
        console.error('No successful API response')
      }
    } catch (error) {
      console.error('Error fetching snapshots:', error)
    }

    // If we still don't have data, return empty array
    if (!snapshots || snapshots.length === 0) {
      snapshots = []
    }

    return NextResponse.json({
      data: snapshots,
      _meta: {
        count: snapshots.length,
        limit: 50,
        offset: 0
      }
    })

  } catch (error) {
    console.error('Snapshots API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snapshots', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}