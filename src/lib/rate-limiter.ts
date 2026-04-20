/**
 * Global Rate Limiter for IP Fabric API calls
 *
 * Prevents 429 rate limit errors by queuing requests and enforcing
 * a minimum interval between API calls (~2.8 req/sec).
 *
 * Features:
 * - Queue-based throttling (more efficient than sleep-based delays)
 * - Group-based abort capability for framework/snapshot switching
 * - Singleton pattern for global coordination
 */

interface QueuedRequest {
  id: string
  execute: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
  groupId?: string
  aborted: boolean
}

interface RateLimiterConfig {
  minInterval: number      // Minimum ms between requests
  maxQueueSize: number     // Maximum pending requests
}

class RateLimiter {
  private static instance: RateLimiter
  private queue: QueuedRequest[] = []
  private processing = false
  private lastRequestTime = 0
  private requestId = 0
  private abortedGroups: Set<string> = new Set()

  private readonly config: RateLimiterConfig = {
    minInterval: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_INTERVAL || '250'),  // 4-5 req/sec - configurable rate to balance speed and safety
    maxQueueSize: 100      // Prevent memory issues from queue buildup
  }

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter()
    }
    return RateLimiter.instance
  }

  /**
   * Enqueue a request to be executed with rate limiting
   * @param fetcher - The async function to execute
   * @param groupId - Optional group ID for bulk abort (e.g., "cis-v8-snapshot123")
   */
  async enqueue<T>(
    fetcher: () => Promise<T>,
    groupId?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `req-${++this.requestId}`

      // Check if this group has been aborted
      if (groupId && this.abortedGroups.has(groupId)) {
        reject(new DOMException('Request aborted - group cancelled', 'AbortError'))
        return
      }

      // Check queue size limit
      if (this.queue.length >= this.config.maxQueueSize) {
        console.warn('[RateLimiter] Queue full, rejecting request')
        reject(new Error('Rate limiter queue full'))
        return
      }

      const request: QueuedRequest = {
        id,
        execute: fetcher,
        resolve,
        reject,
        groupId,
        aborted: false
      }

      this.queue.push(request)
      this.processQueue()
    })
  }

  /**
   * Abort all pending requests in a group
   * Used when switching frameworks or snapshots
   */
  abortGroup(groupId: string): void {
    if (!groupId) return

    // Mark group as aborted (for any new requests that try to join)
    this.abortedGroups.add(groupId)

    // Count how many we're aborting
    const abortCount = this.queue.filter(r => r.groupId === groupId).length

    if (abortCount > 0) {
      console.log(`[RateLimiter] Aborting ${abortCount} requests in group: ${groupId}`)
    }

    // Mark all requests in this group as aborted
    this.queue.forEach(request => {
      if (request.groupId === groupId) {
        request.aborted = true
        request.reject(new DOMException('Request aborted - group cancelled', 'AbortError'))
      }
    })

    // Remove aborted requests from queue
    this.queue = this.queue.filter(r => !r.aborted)

    // Clean up aborted group after a delay (allow re-use of groupId)
    setTimeout(() => {
      this.abortedGroups.delete(groupId)
    }, 1000)
  }

  /**
   * Clear all pending requests
   */
  clearQueue(): void {
    const count = this.queue.length
    if (count > 0) {
      console.log(`[RateLimiter] Clearing ${count} pending requests`)
    }

    this.queue.forEach(request => {
      request.reject(new DOMException('Request aborted - queue cleared', 'AbortError'))
    })
    this.queue = []
    this.abortedGroups.clear()
  }

  /**
   * Get current queue status (for debugging/UI)
   */
  getQueueStatus(): { queued: number; processing: boolean; lastRequestAge: number } {
    return {
      queued: this.queue.length,
      processing: this.processing,
      lastRequestAge: Date.now() - this.lastRequestTime
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const request = this.queue.shift()

      if (!request || request.aborted) {
        continue
      }

      // Calculate required wait time
      const now = Date.now()
      const elapsed = now - this.lastRequestTime
      const waitTime = Math.max(0, this.config.minInterval - elapsed)

      if (waitTime > 0) {
        await this.delay(waitTime)
      }

      // Double-check abort status after waiting
      if (request.aborted) {
        continue
      }

      // Execute the request
      try {
        this.lastRequestTime = Date.now()
        const result = await request.execute()
        request.resolve(result)
      } catch (error) {
        request.reject(error)
      }
    }

    this.processing = false
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Update rate limiter configuration
   * Useful for tuning based on observed behavior
   */
  setConfig(config: Partial<RateLimiterConfig>): void {
    Object.assign(this.config, config)
    console.log(`[RateLimiter] Config updated: ${JSON.stringify(this.config)}`)
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimiterConfig {
    return { ...this.config }
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance()

// Export type for testing
export type { RateLimiterConfig, QueuedRequest }
