/**
 * useTopicAnalysis Hook
 * 
 * Encapsulates all topic/theme analysis logic and state
 * Extracted from App.tsx to improve maintainability and testability
 */

import { useState, useCallback } from 'react'
import type { AnalysisReport, TopicHistoryEntry } from '../types'
import type { Locale } from './useI18n'
import { getAnalysisWithStreaming, getPolymarketAnalysis } from '../services/streamingService'
import { topicAnalysisCache } from '../services/cacheService'

interface UseTopicAnalysisOptions {
  locale: Locale
  t: (key: string, params?: any) => string
  isPaywalled: boolean
  cost: number
  onOpenPaymentModal?: () => void
  onShowToast?: (message: string, type: 'success' | 'info') => void
  onCreditUpdate?: (newBalance: number) => void
}

interface UseTopicAnalysisCallbacks {
  recordAnalysisTimestamp?: () => void
  incrementUserAnalysisCount?: () => void
  updateTopicHistory?: (history: TopicHistoryEntry[]) => void
  checkRateLimit?: () => boolean
  useCredits?: (amount: number) => number
  addCredits?: (amount: number) => number
}

/**
 * Hook for managing topic analysis state and operations
 */
export function useTopicAnalysis(
  options: UseTopicAnalysisOptions,
  callbacks: UseTopicAnalysisCallbacks = {}
) {
  const {
    locale,
    t,
    isPaywalled,
    cost,
    onOpenPaymentModal,
    onShowToast,
    onCreditUpdate
  } = options

  const {
    recordAnalysisTimestamp = () => {},
    incrementUserAnalysisCount = () => {},
    updateTopicHistory = () => {},
    checkRateLimit = () => false,
    useCredits = (amount: number) => 0,
    addCredits = (amount: number) => 0
  } = callbacks

  // State management
  const [userInput, setUserInput] = useState<string>('')
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [topicHistory, setTopicHistory] = useState<TopicHistoryEntry[]>([])
  const [progress, setProgress] = useState<number>(0)
  const [streamingProgress, setStreamingProgress] = useState<number>(0)
  const [partialData, setPartialData] = useState<Partial<AnalysisReport> | null>(null)

  /**
   * Clear all analysis results
   */
  const clearAnalysis = useCallback(() => {
    setAnalysisReport(null)
    setError(null)
    setProgress(0)
    setStreamingProgress(0)
    setPartialData(null)
  }, [])

  /**
   * Clear analysis input
   */
  const clearInput = useCallback(() => {
    setUserInput('')
    setError(null)
  }, [])

  /**
   * Handle topic analysis
   */
  const handleAnalyze = useCallback(
    async (topic: string, bypassCreditCheck = false) => {
      // Validation
      if (!topic.trim()) {
        setError(t('errors.emptyTopic'))
        return
      }

      if (checkRateLimit()) {
        setError(t('errors.rateLimit'))
        return
      }

      // Check payment status
      if (isPaywalled && !bypassCreditCheck) {
        onOpenPaymentModal?.()
        return
      }

      // Clear previous results
      clearAnalysis()
      setIsLoading(true)

      try {
        // Deduct credits
        const updatedBalance = useCredits(cost)
        onCreditUpdate?.(updatedBalance)

        // Check if Polymarket URL
        const isPolymarketUrl = /^https?:\/\/polymarket\.com\//.test(topic.trim())

        let report: AnalysisReport

        if (isPolymarketUrl) {
          // Polymarket analysis
          report = await getPolymarketAnalysis(topic, locale)
        } else {
          // Regular topic analysis with streaming
          report = await getAnalysisWithStreaming(
            topic,
            setProgress,
            locale,
            (progress, data) => {
              setStreamingProgress(progress)
              setPartialData(data)
            }
          )
        }

        // Store result
        setAnalysisReport(report)
        recordAnalysisTimestamp()
        incrementUserAnalysisCount()

        // Update history
        const newEntry: TopicHistoryEntry = { id: Date.now(), topic, report }
        const newHistory = [newEntry, ...topicHistory].slice(0, 20)
        setTopicHistory(newHistory)
        updateTopicHistory(newHistory)

        // Show success toast
        onShowToast?.(t('success.analysisDone'), 'success')
      } catch (err) {
        // Refund credits on failure
        const refundedBalance = addCredits(cost)
        onCreditUpdate?.(refundedBalance)

        // Set error message
        const errorMessage =
          err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError')
        setError(errorMessage)

        console.error('[useTopicAnalysis] Analysis failed:', err)
      } finally {
        setIsLoading(false)
        setProgress(0)
        setStreamingProgress(0)
        setPartialData(null)
      }
    },
    [
      locale,
      t,
      isPaywalled,
      cost,
      checkRateLimit,
      useCredits,
      addCredits,
      topicHistory,
      recordAnalysisTimestamp,
      incrementUserAnalysisCount,
      updateTopicHistory,
      onOpenPaymentModal,
      onShowToast,
      onCreditUpdate,
      clearAnalysis
    ]
  )

  /**
   * Load history from storage
   */
  const loadHistory = useCallback(async (history: TopicHistoryEntry[]) => {
    setTopicHistory(history)
  }, [])

  /**
   * Remove item from history
   */
  const removeFromHistory = useCallback((id: number) => {
    const newHistory = topicHistory.filter(entry => entry.id !== id)
    setTopicHistory(newHistory)
    updateTopicHistory(newHistory)
  }, [topicHistory, updateTopicHistory])

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setTopicHistory([])
    updateTopicHistory([])
  }, [updateTopicHistory])

  /**
   * Retry last failed analysis
   */
  const retry = useCallback(async () => {
    if (userInput.trim()) {
      await handleAnalyze(userInput, true)
    }
  }, [userInput, handleAnalyze])

  return {
    // State
    userInput,
    setUserInput,
    analysisReport,
    setAnalysisReport,
    isLoading,
    error,
    setError,
    topicHistory,
    progress,
    streamingProgress,
    partialData,
    
    // Methods
    handleAnalyze,
    clearAnalysis,
    clearInput,
    loadHistory,
    removeFromHistory,
    clearHistory,
    retry
  }
}

export type UseTopicAnalysisReturn = ReturnType<typeof useTopicAnalysis>
