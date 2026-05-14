/**
 * Secure AI Client Service
 * 
 * This service communicates with the server-side AI API, ensuring
 * API keys are never exposed to the client.
 */

import { addBreadcrumb, captureError } from './sentry'

interface AIAnalysisRequest {
  prompt: string
  systemInstruction: string
  userId: string
  modelName?: string
}

interface AIAnalysisResponse {
  success: boolean
  data?: string
  error?: string
  executionTime?: number
}

/**
 * Call AI analysis through secure server-side API
 * 
 * This replaces direct OpenRouter API calls with server-side requests
 * to keep API keys secure.
 */
export async function callAISecurely(
  request: AIAnalysisRequest,
  onProgress?: (progress: string) => void
): Promise<string> {
  const startTime = Date.now()
  
  addBreadcrumb('ai', 'Calling secure AI API', {
    promptLength: request.prompt.length,
    userId: request.userId,
  })

  try {
    onProgress?.('正在连接 AI 服务...')

    // Get API URL from environment or use relative path for Vercel
    const apiUrl = import.meta.env.VITE_API_URL || '/api/ai-analyze'

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    onProgress?.('等待 AI 响应...')

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `API error: ${response.statusText}`)
    }

    const data: AIAnalysisResponse = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'AI analysis failed')
    }

    if (!data.data) {
      throw new Error('No response from AI service')
    }

    const executionTime = Date.now() - startTime
    
    addBreadcrumb('ai', 'AI analysis completed', {
      executionTime,
      responseLength: data.data.length,
    })

    console.log(`[Client] AI analysis completed in ${executionTime}ms (server: ${data.executionTime}ms)`)

    return data.data
  } catch (error) {
    console.error('[Client] AI API error:', error)
    
    if (error instanceof Error) {
      captureError(error, {
        userId: request.userId,
        promptLength: request.prompt.length,
        apiUrl: import.meta.env.VITE_API_URL,
      })
    }

    throw error
  }
}

/**
 * Batch AI calls with error handling
 */
export async function callAIBatch(
  requests: AIAnalysisRequest[],
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const results: string[] = []
  
  for (let i = 0; i < requests.length; i++) {
    try {
      const result = await callAISecurely(requests[i])
      results.push(result)
      onProgress?.(i + 1, requests.length)
    } catch (error) {
      console.error(`[Client] Batch call ${i} failed:`, error)
      throw error
    }
  }

  return results
}

/**
 * Parallel AI calls for performance
 */
export async function callAIParallel(
  requests: AIAnalysisRequest[]
): Promise<string[]> {
  try {
    const results = await Promise.all(
      requests.map(req => callAISecurely(req))
    )
    return results
  } catch (error) {
    console.error('[Client] Parallel calls failed:', error)
    throw error
  }
}
