import type { VercelRequest, VercelResponse } from '@vercel/node'

// SSGoo API Configuration
const SSGOO_API_BASE_URL = 'https://ai.ssgoo.net'
const SSGOO_API_KEY = process.env.SSGOO_API_KEY || ''

/**
 * SSGoo Claude API Proxy Route
 * 
 * This route proxies requests to SSGoo's Claude API from the server side,
 * avoiding CORS issues that occur when calling directly from the browser.
 * 
 * Usage:
 * POST /api/ssgoo-proxy
 * {
 *   "prompt": "User's analysis request",
 *   "systemInstruction": "System prompt",
 *   "modelName": "claude-sonnet-4-6"
 * }
 */

interface ProxyRequest {
  prompt: string
  systemInstruction: string
  modelName?: string
  maxTokens?: number
}

interface ProxyResponse {
  success: boolean
  data?: any
  error?: string
  executionTime?: number
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<ProxyResponse>
): Promise<void> {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    })
  }

  // Validate API key is configured
  if (!SSGOO_API_KEY) {
    console.error('[SSGoo Proxy] SSGOO_API_KEY is not configured')
    return res.status(500).json({
      success: false,
      error: 'SSGoo API key not configured',
    })
  }

  try {
    const startTime = Date.now()
    const { 
      prompt, 
      systemInstruction, 
      modelName = 'claude-sonnet-4-6',
      maxTokens = 8192 
    } = req.body as ProxyRequest

    // Validate input
    if (!prompt || !systemInstruction) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: prompt, systemInstruction',
      })
    }

    console.log(`[SSGoo Proxy] Calling ${modelName} with prompt length: ${prompt.length}`)

    // Call SSGoo API
    const response = await fetch(`${SSGOO_API_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SSGOO_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: systemInstruction,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[SSGoo Proxy] API error: ${response.status} - ${errorText}`)
      return res.status(response.status).json({
        success: false,
        error: `SSGoo API error: ${response.statusText} - ${errorText}`,
      })
    }

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content

    if (!result) {
      console.error('[SSGoo Proxy] Invalid response structure:', JSON.stringify(data).substring(0, 500))
      return res.status(500).json({
        success: false,
        error: 'Invalid response from SSGoo API',
      })
    }

    const executionTime = Date.now() - startTime
    console.log(`[SSGoo Proxy] Request completed in ${executionTime}ms`)

    return res.status(200).json({
      success: true,
      data: result,
      executionTime,
    })
  } catch (error) {
    console.error('[SSGoo Proxy] Unexpected error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
