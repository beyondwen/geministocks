/**
 * Parallel AI Service
 * 
 * Executes multiple AI calls in parallel for improved performance
 * Handles partial failures gracefully
 */

import { callAISecurely } from './aiClientService'
import type { AIAnalysisRequest } from './aiClientService'

interface ParallelCallResult<T = string> {
  success: boolean
  data?: T
  error?: string
  executionTime: number
}

/**
 * Execute multiple AI calls in parallel
 */
export async function executeParallelAICalls(
  requests: AIAnalysisRequest[],
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const startTime = Date.now()
  console.log(`[ParallelAI] Starting ${requests.length} parallel calls`)

  try {
    const results = await Promise.all(
      requests.map((req, idx) =>
        callAISecurely(req)
          .then(data => {
            onProgress?.(idx + 1, requests.length)
            return data
          })
          .catch(err => {
            console.error(`[ParallelAI] Call ${idx + 1} failed:`, err)
            throw err
          })
      )
    )

    const executionTime = Date.now() - startTime
    console.log(`[ParallelAI] All ${requests.length} calls completed in ${executionTime}ms`)

    return results
  } catch (error) {
    console.error('[ParallelAI] Parallel execution failed:', error)
    throw error
  }
}

/**
 * Execute multiple AI calls with partial failure handling
 */
export async function executeParallelAICallsSafe(
  requests: AIAnalysisRequest[],
  onProgress?: (completed: number, total: number) => void
): Promise<ParallelCallResult<string>[]> {
  const startTime = Date.now()
  console.log(`[ParallelAI] Starting ${requests.length} safe parallel calls`)

  const results = await Promise.allSettled(
    requests.map((req, idx) =>
      callAISecurely(req).then(data => {
        onProgress?.(idx + 1, requests.length)
        return data
      })
    )
  )

  return results.map((result, idx) => {
    const executionTime = Date.now() - startTime
    if (result.status === 'fulfilled') {
      return {
        success: true,
        data: result.value,
        executionTime
      }
    } else {
      return {
        success: false,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        executionTime
      }
    }
  })
}

/**
 * Execute batch AI calls with concurrency limit
 */
export async function executeParallelAICallsWithLimit(
  requests: AIAnalysisRequest[],
  concurrency: number = 3,
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const startTime = Date.now()
  const results: string[] = []
  let completed = 0

  console.log(`[ParallelAI] Starting ${requests.length} calls with concurrency limit ${concurrency}`)

  // Process in batches
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(req =>
        callAISecurely(req)
          .then(data => {
            completed++
            onProgress?.(completed, requests.length)
            return data
          })
          .catch(err => {
            console.error('[ParallelAI] Batch call failed:', err)
            throw err
          })
      )
    )
    results.push(...batchResults)
  }

  const executionTime = Date.now() - startTime
  console.log(`[ParallelAI] Batch execution completed in ${executionTime}ms`)

  return results
}

/**
 * Hook for parallel AI operations
 */
import { useCallback, useState } from 'react'

export function useParallelAI() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const executeParallel = useCallback(
    async (requests: AIAnalysisRequest[], safe = false) => {
      setIsLoading(true)
      setProgress(0)
      setError(null)

      try {
        let results

        if (safe) {
          results = await executeParallelAICallsSafe(requests, (completed, total) => {
            setProgress(Math.round((completed / total) * 100))
          })
        } else {
          results = await executeParallelAICalls(requests, (completed, total) => {
            setProgress(Math.round((completed / total) * 100))
          })
        }

        return results
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
        setProgress(0)
      }
    },
    []
  )

  const executeWithLimit = useCallback(
    async (requests: AIAnalysisRequest[], concurrency = 3) => {
      setIsLoading(true)
      setProgress(0)
      setError(null)

      try {
        const results = await executeParallelAICallsWithLimit(requests, concurrency, (completed, total) => {
          setProgress(Math.round((completed / total) * 100))
        })
        return results
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
        setProgress(0)
      }
    },
    []
  )

  return {
    isLoading,
    progress,
    error,
    executeParallel,
    executeWithLimit
  }
}
