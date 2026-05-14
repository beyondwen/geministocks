import { Pool, QueryResult } from '@neondatabase/serverless'
import type { AnalysisReport, StockAnalysisReport, PositionalWarfareReport, TopicHistoryEntry, StockHistoryEntry, PositionalWarfareHistoryEntry } from '../types'

/**
 * 历史记录数据库服务
 * 将分析历史从 localStorage 迁移到 Neon PostgreSQL 数据库
 */

// Neon 数据库连接
const connectionString = import.meta.env.VITE_NEON_CONNECTION_STRING || process.env.DATABASE_URL

let pool: Pool | null = null

/**
 * 获取数据库连接池
 */
function getPool(): Pool {
  if (!pool && connectionString) {
    pool = new Pool({ connectionString })
  }
  return pool!
}

/**
 * 保存分析历史记录到数据库
 */
export async function saveAnalysisHistory(
  userId: string,
  historyEntries: TopicHistoryEntry[]
): Promise<void> {
  if (!connectionString) {
    console.warn('[v0] Database connection not configured, skipping history save')
    return
  }

  try {
    const pool = getPool()
    
    // 删除该用户的旧记录
    await pool.query(
      'DELETE FROM analyses WHERE user_id = $1 AND analysis_type = $2',
      [userId, 'topic']
    )

    // 批量插入新记录
    for (const entry of historyEntries) {
      await pool.query(
        `INSERT INTO analyses (user_id, analysis_type, input_query, result, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          'topic',
          entry.topic,
          JSON.stringify(entry.report),
          new Date().toISOString(),
        ]
      )
    }

    console.log(`[v0] Saved ${historyEntries.length} topic analysis records to database`)
  } catch (error) {
    console.error('[v0] Failed to save analysis history:', error)
    // 不中断用户操作 - 在后台失败是可以接受的
  }
}

/**
 * 从数据库加载分析历史记录
 */
export async function loadAnalysisHistory(userId: string): Promise<TopicHistoryEntry[]> {
  if (!connectionString) {
    console.warn('[v0] Database connection not configured, skipping history load')
    return []
  }

  try {
    const pool = getPool()
    const result = await pool.query(
      `SELECT input_query, result, created_at FROM analyses 
       WHERE user_id = $1 AND analysis_type = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId, 'topic']
    )

    const entries: TopicHistoryEntry[] = result.rows.map((row: any) => ({
      id: Date.now() + Math.random(), // 简单的 ID 生成
      topic: row.input_query,
      report: JSON.parse(row.result),
    }))

    console.log(`[v0] Loaded ${entries.length} topic analysis records from database`)
    return entries
  } catch (error) {
    console.error('[v0] Failed to load analysis history:', error)
    return []
  }
}

/**
 * 保存股票分析历史记录
 */
export async function saveStockAnalysisHistory(
  userId: string,
  historyEntries: StockHistoryEntry[]
): Promise<void> {
  if (!connectionString) {
    return
  }

  try {
    const pool = getPool()
    
    await pool.query(
      'DELETE FROM analyses WHERE user_id = $1 AND analysis_type = $2',
      [userId, 'stock']
    )

    for (const entry of historyEntries) {
      await pool.query(
        `INSERT INTO analyses (user_id, analysis_type, input_query, result, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          'stock',
          entry.query,
          JSON.stringify(entry.report),
          new Date().toISOString(),
        ]
      )
    }

    console.log(`[v0] Saved ${historyEntries.length} stock analysis records`)
  } catch (error) {
    console.error('[v0] Failed to save stock history:', error)
  }
}

/**
 * 加载股票分析历史记录
 */
export async function loadStockAnalysisHistory(userId: string): Promise<StockHistoryEntry[]> {
  if (!connectionString) {
    return []
  }

  try {
    const pool = getPool()
    const result = await pool.query(
      `SELECT input_query, result FROM analyses 
       WHERE user_id = $1 AND analysis_type = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId, 'stock']
    )

    const entries: StockHistoryEntry[] = result.rows.map((row: any) => ({
      id: Date.now() + Math.random(),
      query: row.input_query,
      report: JSON.parse(row.result),
    }))

    console.log(`[v0] Loaded ${entries.length} stock analysis records from database`)
    return entries
  } catch (error) {
    console.error('[v0] Failed to load stock history:', error)
    return []
  }
}

/**
 * 删除分析历史记录
 */
export async function deleteAnalysisHistory(userId: string, analysisId: number): Promise<void> {
  if (!connectionString) {
    return
  }

  try {
    const pool = getPool()
    await pool.query(
      'DELETE FROM analyses WHERE user_id = $1 AND id = $2',
      [userId, analysisId]
    )
    console.log('[v0] Deleted analysis record from database')
  } catch (error) {
    console.error('[v0] Failed to delete analysis history:', error)
  }
}

/**
 * 清空所有分析历史记录
 */
export async function clearAllAnalysisHistory(userId: string): Promise<void> {
  if (!connectionString) {
    return
  }

  try {
    const pool = getPool()
    await pool.query(
      'DELETE FROM analyses WHERE user_id = $1',
      [userId]
    )
    console.log('[v0] Cleared all analysis history from database')
  } catch (error) {
    console.error('[v0] Failed to clear analysis history:', error)
  }
}
