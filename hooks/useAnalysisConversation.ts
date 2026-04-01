/**
 * useAnalysisConversation Hook
 * 
 * Manages follow-up question conversations for analysis reports
 */

import { useState, useCallback } from 'react'
import type { AnalysisReport, StockAnalysisReport, PositionalWarfareReport } from '../types'
import { callAISecurely } from '../services/aiClientService'
import type { Locale } from './useI18n'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ConversationState {
  messages: Message[]
  isLoading: boolean
  error: string | null
}

interface UseAnalysisConversationOptions {
  report: AnalysisReport | StockAnalysisReport | PositionalWarfareReport
  userId: string
  locale: Locale
  t: (key: string, params?: any) => string
  onShowToast?: (message: string, type: 'success' | 'info') => void
}

/**
 * Hook for managing analysis follow-up conversations
 */
export function useAnalysisConversation(options: UseAnalysisConversationOptions) {
  const { report, userId, locale, t, onShowToast } = options

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Build context from report and conversation history
   */
  const buildContext = useCallback((): string => {
    const reportSummary = buildReportSummary(report)
    const conversationContext = messages
      .map((msg) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
      .join('\n\n')

    return `
原始分析报告:
${reportSummary}

对话历史:
${conversationContext || '无之前的对话'}

请基于以上信息回答用户的问题。`
  }, [report, messages])

  /**
   * Build system instruction for follow-up
   */
  const buildSystemInstruction = useCallback((): string => {
    const reportType = detectReportType(report)
    
    const instructions: Record<string, string> = {
      topic: `你是一个专业的投资分析师，正在帮助用户理解一份详细的主题投资分析报告。
      
请根据报告内容和对话历史，以专业、准确的方式回答用户的追问。
保持对话的连贯性和上下文一致性。
如果用户的问题超出报告范围，礼貌地指出。`,

      stock: `你是一个专业的证券分析师，正在帮助用户理解一份详细的股票分析报告。
      
请根据财务数据、估值分析和技术指标，回答用户的追问。
保持分析的专业性和数据准确性。
对于投资建议，请明确声明这不是投资建议。`,

      warfare: `你是一个专业的市场分析师，正在帮助用户理解竞争格局和投资机会。
      
请基于龙头股票和追随者分析框架，回答关于竞争位置的问题。
考虑市场动态和相对优势。`
    }

    return instructions[reportType] || instructions.topic
  }, [report])

  /**
   * Send a follow-up question
   */
  const askFollowUp = useCallback(
    async (question: string) => {
      if (!question.trim()) {
        setError(t('errors.emptyInput'))
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Call AI with context
        const answer = await callAISecurely({
          prompt: `${buildContext()}\n\n用户问题: ${question}`,
          systemInstruction: buildSystemInstruction(),
          userId,
          modelName: 'openai/gpt-5-mini'
        })

        // Add messages to history
        const newMessages: Message[] = [
          ...messages,
          { role: 'user', content: question, timestamp: Date.now() },
          { role: 'assistant', content: answer, timestamp: Date.now() }
        ]

        setMessages(newMessages)
        onShowToast?.(t('success.answered'), 'success')
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t('errors.unknownError')
        setError(errorMessage)
        console.error('[useAnalysisConversation] Error:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [messages, userId, buildContext, buildSystemInstruction, t, onShowToast]
  )

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  /**
   * Export conversation
   */
  const exportConversation = useCallback((): string => {
    const data = {
      report: report,
      conversation: messages,
      exportedAt: new Date().toISOString()
    }
    return JSON.stringify(data, null, 2)
  }, [report, messages])

  return {
    messages,
    isLoading,
    error,
    askFollowUp,
    clearHistory,
    exportConversation,
    messageCount: messages.length
  }
}

/**
 * Helper: Detect report type
 */
function detectReportType(
  report: AnalysisReport | StockAnalysisReport | PositionalWarfareReport
): string {
  if ('investmentScore' in report && 'investmentThesis' in report) {
    if ('selectedFollowers' in report) return 'warfare'
    if ('stockAnalysis' in report) return 'stock'
  }
  return 'topic'
}

/**
 * Helper: Build report summary
 */
function buildReportSummary(
  report: AnalysisReport | StockAnalysisReport | PositionalWarfareReport
): string {
  if ('investmentScore' in report && 'investmentThesis' in report) {
    // Topic or Stock analysis
    if ('selectedFollowers' in report) {
      // Positional Warfare
      const pw = report as PositionalWarfareReport
      return `
阵地战分析:
- 龙头股票: ${pw.leaderStock.ticker}
- 投资评分: ${pw.investmentScore}/100
- 龙头价值: ${pw.leaderStock.advantages?.join(', ')}
- 追随者候选: ${pw.selectedFollowers.map((f) => f.ticker).join(', ')}
`
    } else if ('stockAnalysis' in report) {
      // Stock analysis
      const stock = report as StockAnalysisReport
      return `
股票分析:
- 股票代码: ${stock.stockSymbol}
- 投资评分: ${stock.investmentScore}/100
- 当前估值: ${stock.valuation?.current}
- 目标价格: ${stock.valuation?.targetPrice}
- 核心观点: ${stock.investmentThesis?.bullishCase}
`
    } else {
      // Topic analysis
      const topic = report as AnalysisReport
      return `
主题投资分析:
- 话题: ${topic.topic}
- 投资评分: ${topic.investmentScore}/100
- 市场规模: TAM ${topic.marketSize?.tam}, SAM ${topic.marketSize?.sam}
- 催化剂: ${topic.catalysts?.nearTerm?.join(', ')}
- 投资策略: ${topic.investmentRecommendations?.shortTerm}
`
    }
  }

  return '分析报告'
}

export type UseAnalysisConversationReturn = ReturnType<typeof useAnalysisConversation>
