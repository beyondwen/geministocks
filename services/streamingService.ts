import type { AnalysisReport, StockAnalysisReport } from '../types'
import type { Locale } from '../hooks/useI18n'
import { getAnalysis as getAnalysisLegacy, getStockAnalysis as getStockAnalysisLegacy } from './geminiService'

/**
 * Enhanced analysis function with simulated streaming progress
 * This provides better UX by showing incremental progress during analysis
 */
export async function getAnalysisWithStreaming(
  topic: string,
  onProgress: (stepIndex: number) => void,
  locale: Locale,
  onStreamProgress?: (progress: number, data: Partial<AnalysisReport>) => void
): Promise<AnalysisReport> {
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
 * Enhanced stock analysis function with simulated streaming progress
 */
export async function getStockAnalysisWithStreaming(
  stockQuery: string,
  onProgress: (stepIndex: number) => void,
  locale: Locale,
  onStreamProgress?: (progress: number, data: Partial<StockAnalysisReport>) => void
): Promise<StockAnalysisReport> {
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
