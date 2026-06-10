/**
 * useStockAnalysis Hook
 * 
 * Manages stock analysis state and operations
 * Handles both standalone and inline stock analyses
 */

import { useState, useCallback } from 'react'
import type { StockAnalysisReport, StockHistoryEntry } from '../types'
import type { Locale } from './useI18n'
import { getStockAnalysisWithStreaming } from '../services/streamingService'

interface UseStockAnalysisOptions {
  locale: Locale
  t: (key: string, params?: any) => string
  isPaywalled: boolean
  cost: number
  onOpenPaymentModal?: () => void
  onShowToast?: (message: string, type: 'success' | 'info') => void
  onCreditUpdate?: (newBalance: number) => void
}

interface UseStockAnalysisCallbacks {
  recordAnalysisTimestamp?: () => void
  incrementUserAnalysisCount?: () => void
  updateStockHistory?: (history: StockHistoryEntry[]) => void
  checkRateLimit?: () => boolean
  useCredits?: (amount: number) => number
  addCredits?: (amount: number) => number
}

export function useStockAnalysis(
  options: UseStockAnalysisOptions,
  callbacks: UseStockAnalysisCallbacks = {}
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
    updateStockHistory = () => {},
    checkRateLimit = () => false,
    useCredits = (amount: number) => 0,
    addCredits = (amount: number) => 0
  } = callbacks

  // Main stock analysis state
  const [stockQuery, setStockQuery] = useState<string>('')
  const [stockAnalysisReport, setStockAnalysisReport] = useState<StockAnalysisReport | null>(null)
  const [isStockLoading, setIsStockLoading] = useState<boolean>(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [hotStocks, setHotStocks] = useState<{name: string; ticker: string}[]>([])
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([])
  const [stockProgress, setStockProgress] = useState<number>(0)
  const [streamingStockProgress, setStreamingStockProgress] = useState<number>(0)
  const [partialStockData, setPartialStockData] = useState<Partial<StockAnalysisReport> | null>(null)

  // Inline stock analysis state
  const [inlineStockAnalysisReport, setInlineStockAnalysisReport] = useState<StockAnalysisReport | null>(null)
  const [isInlineStockLoading, setIsInlineStockLoading] = useState<boolean>(false)
  const [inlineStockProgress, setInlineStockProgress] = useState<number>(0)
  const [inlineStockError, setInlineStockError] = useState<string | null>(null)

  const clearAnalysis = useCallback(() => {
    setStockAnalysisReport(null)
    setStockError(null)
    setStockProgress(0)
    setStreamingStockProgress(0)
    setPartialStockData(null)
  }, [])

  const handleStockAnalyze = useCallback(
    async (query: string, bypassCreditCheck = false) => {
      if (!query.trim()) {
        setStockError(t('errors.emptyStock'))
        return
      }

      if (checkRateLimit()) {
        setStockError(t('errors.rateLimit'))
        return
      }

      if (isPaywalled && !bypassCreditCheck) {
        onOpenPaymentModal?.()
        return
      }

      clearAnalysis()
      setIsStockLoading(true)

      try {
        const updatedBalance = useCredits(cost)
        onCreditUpdate?.(updatedBalance)

        const report = await getStockAnalysisWithStreaming(
          query,
          setStockProgress,
          locale,
          (progress, data) => {
            setStreamingStockProgress(progress)
            setPartialStockData(data)
          }
        )

        setStockAnalysisReport(report)
        recordAnalysisTimestamp()
        incrementUserAnalysisCount()

        const newEntry: StockHistoryEntry = { id: Date.now(), query, report }
        const newHistory = [newEntry, ...stockHistory].slice(0, 20)
        setStockHistory(newHistory)
        updateStockHistory(newHistory)

        onShowToast?.(t('success.analysisDone'), 'success')
      } catch (err) {
        const refundedBalance = addCredits(cost)
        onCreditUpdate?.(refundedBalance)

        const errorMessage =
          err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError')
        setStockError(errorMessage)

        console.error('[useStockAnalysis] Analysis failed:', err)
      } finally {
        setIsStockLoading(false)
        setStockProgress(0)
        setStreamingStockProgress(0)
        setPartialStockData(null)
      }
    },
    [locale, t, isPaywalled, cost, checkRateLimit, useCredits, addCredits, stockHistory, recordAnalysisTimestamp, incrementUserAnalysisCount, updateStockHistory, onOpenPaymentModal, onShowToast, onCreditUpdate, clearAnalysis]
  )

  const handleInlineStockAnalyze = useCallback(
    async (ticker: string, bypassCreditCheck = false) => {
      if (!ticker.trim()) {
        setInlineStockError(t('errors.emptyStock'))
        return
      }

      if (isPaywalled && !bypassCreditCheck) {
        onOpenPaymentModal?.()
        return
      }

      setInlineStockAnalysisReport(null)
      setInlineStockError(null)
      setIsInlineStockLoading(true)

      try {
        const updatedBalance = useCredits(cost)
        onCreditUpdate?.(updatedBalance)

        const report = await getStockAnalysisWithStreaming(
          ticker,
          setInlineStockProgress,
          locale
        )

        setInlineStockAnalysisReport(report)
      } catch (err) {
        const refundedBalance = addCredits(cost)
        onCreditUpdate?.(refundedBalance)

        const errorMessage =
          err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError')
        setInlineStockError(errorMessage)
      } finally {
        setIsInlineStockLoading(false)
        setInlineStockProgress(0)
      }
    },
    [locale, t, isPaywalled, cost, useCredits, addCredits, onOpenPaymentModal, onShowToast, onCreditUpdate]
  )

  const clearHistory = useCallback(() => {
    setStockHistory([])
    updateStockHistory([])
  }, [updateStockHistory])

  return {
    // Main analysis
    stockQuery, setStockQuery,
    stockAnalysisReport, setStockAnalysisReport,
    isStockLoading,
    stockError, setStockError,
    hotStocks, setHotStocks,
    stockHistory,
    stockProgress,
    streamingStockProgress,
    partialStockData,

    // Inline analysis
    inlineStockAnalysisReport, setInlineStockAnalysisReport,
    isInlineStockLoading,
    inlineStockProgress,
    inlineStockError,

    // Methods
    handleStockAnalyze,
    handleInlineStockAnalyze,
    clearAnalysis,
    clearHistory
  }
}

export type UseStockAnalysisReturn = ReturnType<typeof useStockAnalysis>
