import type { AnalysisReport, StockAnalysisReport } from '../types'
import type { Locale } from '../hooks/useI18n'
import { getAnalysis as getAnalysisLegacy, getStockAnalysis as getStockAnalysisLegacy } from './geminiService'
import { topicAnalysisCache, stockAnalysisCache, initCacheCleanup } from './cacheService'

// Initialize cache cleanup on module load
if (typeof window !== 'undefined') {
  initCacheCleanup()
}

/**
 * Enhanced analysis function with caching + simulated streaming progress
 * Returns cached results if available, otherwise calls AI and caches the result
 */
export async function getAnalysisWithStreaming(
  topic: string,
  onProgress: (stepIndex: number) => void,
  locale: Locale,
  onStreamProgress?: (progress: number, data: Partial<AnalysisReport>) => void
): Promise<AnalysisReport> {
  // Check cache first
  const cached = topicAnalysisCache.get(topic)
  if (cached) {
    console.log('[v0] Returning cached topic analysis')
    onStreamProgress?.(100, cached)
    return cached
  }

  // Start progress simulation
  let currentProgress = 0
  const progressInterval = setInterval(() => {
    if (currentProgress < 90) {
      currentProgress += Math.random() * 5 + 2
      currentProgress = Math.min(currentProgress, 90)
      onStreamProgress?.(Math.round(currentProgress), {})
    }
  }, 500)

  try {
    console.log('[v0] Starting topic analysis with progress tracking')
    const result = await getAnalysisLegacy(topic, onProgress, locale)
    
    // Cache the result
    topicAnalysisCache.set(topic, result)
    
    // Complete the progress
    clearInterval(progressInterval)
    onStreamProgress?.(100, result)
    
    return result
  } catch (error) {
    clearInterval(progressInterval)
    throw error
  }
}

/**
 * Enhanced stock analysis function with caching + simulated streaming progress
 */
export async function getStockAnalysisWithStreaming(
  stockQuery: string,
  onProgress: (stepIndex: number) => void,
  locale: Locale,
  onStreamProgress?: (progress: number, data: Partial<StockAnalysisReport>) => void
): Promise<StockAnalysisReport> {
  // Check cache first
  const cached = stockAnalysisCache.get(stockQuery)
  if (cached) {
    console.log('[v0] Returning cached stock analysis')
    onStreamProgress?.(100, cached)
    return cached
  }

  // Start progress simulation
  let currentProgress = 0
  const progressInterval = setInterval(() => {
    if (currentProgress < 90) {
      currentProgress += Math.random() * 5 + 2
      currentProgress = Math.min(currentProgress, 90)
      onStreamProgress?.(Math.round(currentProgress), {})
    }
  }, 500)

  try {
    console.log('[v0] Starting stock analysis with progress tracking')
    const result = await getStockAnalysisLegacy(stockQuery, onProgress, locale)
    
    // Cache the result
    stockAnalysisCache.set(stockQuery, result)
    
    clearInterval(progressInterval)
    onStreamProgress?.(100, result)
    
    return result
  } catch (error) {
    clearInterval(progressInterval)
    throw error
  }
}

// Re-export the original functions
export { 
  getAnalysis, 
  getStockAnalysis,
  getPolymarketAnalysis, 
  findIndustryLeader, 
  getPositionalWarfareFollowerAnalysis, 
  getHotStocksFromAI 
} from './geminiService'
