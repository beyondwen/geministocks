import type { TopicHistoryEntry, StockHistoryEntry, PositionalWarfareHistoryEntry } from '../types'
import { saveAnalysisHistory, loadAnalysisHistory, saveStockAnalysisHistory, loadStockAnalysisHistory } from './historyService'

/**
 * 混合存储服务 - 优先使用数据库，回退到 localStorage
 */

const TOPIC_HISTORY_KEY = 'topic_analysis_history'
const STOCK_HISTORY_KEY = 'stock_analysis_history'
const POSITIONAL_WARFARE_HISTORY_KEY = 'positional_warfare_history'

/**
 * 保存话题分析历史（数据库 + localStorage 混合）
 */
export async function saveTopicHistory(userId: string, entries: TopicHistoryEntry[]): Promise<void> {
  // 始终保存到 localStorage 作为备份
  localStorage.setItem(TOPIC_HISTORY_KEY, JSON.stringify(entries))
  
  // 尝试保存到数据库（不阻塞用户操作）
  try {
    await saveAnalysisHistory(userId, entries)
  } catch (error) {
    console.log('[v0] Database save failed, using localStorage as backup')
  }
}

/**
 * 加载话题分析历史
 */
export async function loadTopicHistory(userId: string): Promise<TopicHistoryEntry[]> {
  // 优先从数据库加载
  try {
    const dbHistory = await loadAnalysisHistory(userId)
    if (dbHistory.length > 0) {
      return dbHistory
    }
  } catch (error) {
    console.log('[v0] Database load failed, falling back to localStorage')
  }
  
  // 备选方案：从 localStorage 加载
  const stored = localStorage.getItem(TOPIC_HISTORY_KEY)
  return stored ? JSON.parse(stored) : []
}

/**
 * 保存股票分析历史
 */
export async function saveStockHistory(userId: string, entries: StockHistoryEntry[]): Promise<void> {
  localStorage.setItem(STOCK_HISTORY_KEY, JSON.stringify(entries))
  
  try {
    await saveStockAnalysisHistory(userId, entries)
  } catch (error) {
    console.log('[v0] Stock history database save failed, using localStorage')
  }
}

/**
 * 加载股票分析历史
 */
export async function loadStockHistory(userId: string): Promise<StockHistoryEntry[]> {
  try {
    const dbHistory = await loadStockAnalysisHistory(userId)
    if (dbHistory.length > 0) {
      return dbHistory
    }
  } catch (error) {
    console.log('[v0] Stock history database load failed')
  }
  
  const stored = localStorage.getItem(STOCK_HISTORY_KEY)
  return stored ? JSON.parse(stored) : []
}

/**
 * 保存阵地战分析历史
 */
export function savePositionalWarfareHistory(entries: PositionalWarfareHistoryEntry[]): void {
  localStorage.setItem(POSITIONAL_WARFARE_HISTORY_KEY, JSON.stringify(entries))
}

/**
 * 加载阵地战分析历史
 */
export function loadPositionalWarfareHistory(): PositionalWarfareHistoryEntry[] {
  const stored = localStorage.getItem(POSITIONAL_WARFARE_HISTORY_KEY)
  return stored ? JSON.parse(stored) : []
}

/**
 * 清空所有本地历史记录
 */
export function clearLocalHistory(): void {
  localStorage.removeItem(TOPIC_HISTORY_KEY)
  localStorage.removeItem(STOCK_HISTORY_KEY)
  localStorage.removeItem(POSITIONAL_WARFARE_HISTORY_KEY)
  console.log('[v0] Local history cleared')
}
