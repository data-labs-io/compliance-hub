import { useState, useEffect, useCallback, useRef } from 'react'
import { useSnapshotContext } from '@/contexts/SnapshotContext'
import { apiFetch, getApiBasePath } from '@/lib/api-path'
import { rateLimiter } from '@/lib/rate-limiter'

interface APIOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
  skipSnapshot?: boolean // Allow skipping snapshot for certain calls
  groupId?: string // For rate limiter grouping (e.g., "pci-dss-snapshot123")
  skipRateLimiter?: boolean // Bypass rate limiter for priority requests
}

interface APIState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useIPFabricAPI<T = any>(
  endpoint: string,
  options: APIOptions = {}
) {
  const { selectedSnapshot } = useSnapshotContext()
  const [state, setState] = useState<APIState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const { method = 'GET', body, headers = {}, skipSnapshot = false } = options

  const makeRequest = useCallback(async (customEndpoint?: string, customOptions?: APIOptions) => {
    const actualEndpoint = customEndpoint || endpoint
    const actualOptions = customOptions || options
    const { method: actualMethod = 'GET', body: actualBody, headers: actualHeaders = {}, skipSnapshot: actualSkipSnapshot = false } = actualOptions

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Construct URL with snapshot parameter
      const url = new URL(`/api/ipfabric/proxy/${actualEndpoint}`, window.location.origin)

      // Add snapshot ID to URL only for GET requests or non-tables endpoints
      // For POST to tables API, snapshot goes in the body
      if (!actualSkipSnapshot && selectedSnapshot) {
        // Only add to URL for GET requests or non-tables endpoints
        if (actualMethod === 'GET' || !actualEndpoint.startsWith('tables/')) {
          url.searchParams.set('snapshotId', selectedSnapshot)
        }
      }

      const requestOptions: RequestInit = {
        method: actualMethod,
        headers: {
          'Content-Type': 'application/json',
          ...actualHeaders
        }
      }

      if (actualBody && actualMethod !== 'GET') {
        requestOptions.body = JSON.stringify(actualBody)
      }

      const response = await apiFetch(url.pathname + url.search, requestOptions)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState({ data: null, loading: false, error: errorMessage })
      throw error
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, method, body, headers, skipSnapshot, selectedSnapshot])

  // Auto-fetch on mount and when dependencies change (for GET requests)
  useEffect(() => {
    if (method === 'GET' && endpoint) {
      makeRequest()
    }
  }, [makeRequest, method, endpoint])

  return {
    ...state,
    refetch: makeRequest,
    mutate: makeRequest // For non-GET requests
  }
}

// Helper hook for making manual API calls with snapshot context
export function useIPFabricAPICall() {
  const { selectedSnapshot } = useSnapshotContext()

  // Use ref to avoid recreating the callback when selectedSnapshot changes
  // This keeps the apiCall function reference stable across renders
  const snapshotRef = useRef(selectedSnapshot)

  // Update ref when selectedSnapshot changes
  useEffect(() => {
    snapshotRef.current = selectedSnapshot
  }, [selectedSnapshot])

  const call = useCallback(async <T = any>(
    endpoint: string,
    options: APIOptions = {},
    retryCount = 0
  ): Promise<T> => {
    const { method = 'GET', body, headers = {}, skipSnapshot = false, groupId, skipRateLimiter = false } = options
    const maxRetries = 3
    const baseDelay = 1000 // 1 second

    // The actual fetch function
    const doFetch = async (): Promise<T> => {
      // Construct URL with snapshot parameter
      const url = new URL(`/api/ipfabric/proxy/${endpoint}`, window.location.origin)

      // Read snapshot from ref (always latest value, but doesn't recreate callback)
      const currentSnapshot = snapshotRef.current

      // Add snapshot ID to URL only for GET requests or non-tables endpoints
      // For POST to tables API, snapshot goes in the body
      if (!skipSnapshot && currentSnapshot) {
        // Only add to URL for GET requests or non-tables endpoints
        if (method === 'GET' || !endpoint.startsWith('tables/')) {
          url.searchParams.set('snapshotId', currentSnapshot)
        }
      }

      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }

      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body)
      }

      const response = await apiFetch(url.pathname + url.search, requestOptions)

      if (!response.ok) {
        // Handle authentication errors (token missing/invalid/expired)
        if (response.status === 401 || response.status === 403) {
          // Emit global auth error event for AuthErrorBoundary to handle
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('authError', {
              detail: { status: response.status, isAuthError: true }
            }))
          }
          return { _error: { status: response.status, statusText: response.statusText, isAuthError: true } } as T
        }

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          if (retryCount < maxRetries) {
            // Calculate exponential backoff delay
            const delay = baseDelay * Math.pow(2, retryCount)
            console.warn(`[API] Rate limited (429) on ${endpoint}. Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay))

            // Retry the request (bypass rate limiter since we're already in a retry)
            return call(endpoint, { ...options, skipRateLimiter: true }, retryCount + 1)
          } else {
            // Max retries exceeded - return error object for graceful degradation
            console.error(`[API] Rate limit exceeded for ${endpoint} after ${maxRetries} retries`)
            return { _error: { status: 429, statusText: 'Too Many Requests - Rate Limit Exceeded', isRateLimited: true } } as T
          }
        }

        // For specific known cases where endpoints might not exist or have invalid requests, let services handle gracefully
        if (response.status === 404 || response.status === 410 || response.status === 422) {
          return { _error: { status: response.status, statusText: response.statusText } } as T
        }

        // For other critical errors, still throw
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      return response.json()
    }

    // Route through rate limiter unless explicitly skipped or in retry mode
    if (skipRateLimiter) {
      return doFetch()
    }

    // Use rate limiter for all normal requests
    try {
      return await rateLimiter.enqueue(doFetch, groupId)
    } catch (error) {
      // Handle abort errors gracefully (from framework/snapshot switch)
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log(`[API] Request aborted: ${endpoint}`)
        return { _error: { status: 0, statusText: 'Request aborted', isAborted: true } } as T
      }
      throw error
    }
  }, []) // Empty deps - selectedSnapshot read from ref, keeping callback stable

  return call
}