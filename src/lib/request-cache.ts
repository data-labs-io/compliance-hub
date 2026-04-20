interface CacheEntry {
  data: any
  timestamp: number
  promise?: Promise<any>
}

class RequestCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes cache
  private readonly pendingRequests: Map<string, Promise<any>> = new Map()

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}:${JSON.stringify(params || {})}`
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.TTL
  }

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    // Check if there's already a pending request for this key
    const pendingRequest = this.pendingRequests.get(key)
    if (pendingRequest) {
      return pendingRequest
    }

    // Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = this.cache.get(key)
      if (cached && !this.isExpired(cached.timestamp)) {
        return cached.data
      }
    }

    // Create new request and store as pending
    const promise = fetcher()
      .then((data) => {
        // Cache the successful result
        this.cache.set(key, {
          data,
          timestamp: Date.now()
        })
        return data
      })
      .finally(() => {
        // Remove from pending requests
        this.pendingRequests.delete(key)
      })

    // Store as pending request
    this.pendingRequests.set(key, promise)

    return promise
  }

  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  clearPattern(pattern: string): void {
    const keys = Array.from(this.cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    })
  }
}

// Singleton instance
export const requestCache = new RequestCache()

// Helper function for API calls with caching
export async function cachedApiCall<T>(
  endpoint: string,
  apiCall: () => Promise<T>,
  options?: {
    forceRefresh?: boolean
    cacheKey?: string
  }
): Promise<T> {
  const key = options?.cacheKey || endpoint
  return requestCache.get(key, apiCall, options?.forceRefresh)
}