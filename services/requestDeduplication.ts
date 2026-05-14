/**
 * Request Deduplication Service
 * 
 * Prevents duplicate API calls for the same request
 * Uses AbortController to cancel in-flight requests
 */

interface PendingRequest<T> {
  promise: Promise<T>
  abortController: AbortController
  timestamp: number
}

class RequestDeduplicator {
  private pending: Map<string, PendingRequest<any>> = new Map()
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private cacheMaxAge = 1000 * 60 * 5 // 5 minutes

  /**
   * Generate cache key from parameters
   */
  private generateKey(namespace: string, params: any): string {
    return `${namespace}:${JSON.stringify(params)}`
  }

  /**
   * Execute request with deduplication
   */
  async execute<T>(
    namespace: string,
    params: any,
    fetcher: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    const key = this.generateKey(namespace, params)

    // Check cache first
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
      console.log(`[Dedup] Cache hit for ${key}`)
      return cached.data
    }

    // Check if request already in flight
    const pending = this.pending.get(key)
    if (pending) {
      console.log(`[Dedup] Reusing in-flight request for ${key}`)
      return pending.promise
    }

    // Create new request
    console.log(`[Dedup] Creating new request for ${key}`)
    const abortController = new AbortController()

    const promise = fetcher(abortController.signal)
      .then(data => {
        // Cache successful result
        this.cache.set(key, { data, timestamp: Date.now() })
        return data
      })
      .finally(() => {
        // Remove from pending
        this.pending.delete(key)
      })

    // Store pending request
    this.pending.set(key, { promise, abortController, timestamp: Date.now() })

    return promise
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    for (const { abortController } of this.pending.values()) {
      abortController.abort()
    }
    this.pending.clear()
  }

  /**
   * Cancel requests by namespace
   */
  cancelByNamespace(namespace: string): void {
    for (const [key, { abortController }] of this.pending.entries()) {
      if (key.startsWith(namespace)) {
        abortController.abort()
        this.pending.delete(key)
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      pendingRequests: this.pending.size,
      cachedItems: this.cache.size,
      activeTasks: Array.from(this.pending.entries()).map(([key]) => key)
    }
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator()

/**
 * Hook for using deduplication in components
 */
import { useCallback, useEffect, useRef } from 'react'

export function useDeduplicatedRequest<T>(namespace: string) {
  const abortControllerRef = useRef<AbortController | null>(null)

  const executeRequest = useCallback(
    async (params: any, fetcher: (signal: AbortSignal) => Promise<T>): Promise<T> => {
      try {
        return await requestDeduplicator.execute(namespace, params, fetcher)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.log(`[Dedup] Request cancelled: ${namespace}`)
          return null as any
        }
        throw err
      }
    },
    [namespace]
  )

  const cancelRequests = useCallback(() => {
    requestDeduplicator.cancelByNamespace(namespace)
  }, [namespace])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRequests()
    }
  }, [cancelRequests])

  return {
    executeRequest,
    cancelRequests,
    getStats: () => requestDeduplicator.getStats()
  }
}
