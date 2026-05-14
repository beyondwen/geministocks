/**
 * Data Synchronization Service
 * 
 * Handles syncing credits, analyses, and settings between
 * local storage and database for logged-in users
 */

import { neon } from '@neondatabase/serverless'
import type { TopicHistoryEntry, StockHistoryEntry, PositionalWarfareHistoryEntry, AnalysisReport, StockAnalysisReport, PositionalWarfareReport } from '../types'

// Types
export interface UserCredits {
  balance: number
  dailyFreeCredits: number
  dailyFreeUsed: number
  lastFreeDate: string | null
}

export interface SyncStatus {
  lastSyncAt: number
  pendingChanges: number
  syncInProgress: boolean
}

// Local storage keys
const LOCAL_CREDITS_KEY = 'gemini-claude-credits'
const SYNC_STATUS_KEY = 'gemini-sync-status'

/**
 * Get database connection
 */
function getDb() {
  const connectionString = import.meta.env.VITE_NEON_CONNECTION_STRING || 
                           import.meta.env.DATABASE_URL ||
                           process.env.DATABASE_URL
  
  if (!connectionString) {
    throw new Error('Database connection string not found')
  }
  
  return neon(connectionString)
}

/**
 * Get user credits from database
 */
export async function getCreditsFromDb(userId: string): Promise<UserCredits> {
  const sql = getDb()
  
  const credits = await sql`
    SELECT balance, daily_free_credits, daily_free_used, last_free_credit_date
    FROM credits WHERE user_id = ${userId}
  `
  
  if (credits.length === 0) {
    // Initialize credits for user
    const now = new Date().toISOString()
    await sql`
      INSERT INTO credits (user_id, balance, created_at, updated_at, daily_free_credits, daily_free_used)
      VALUES (${userId}, 10, ${now}, ${now}, 3, 0)
    `
    return {
      balance: 10,
      dailyFreeCredits: 3,
      dailyFreeUsed: 0,
      lastFreeDate: null
    }
  }
  
  return {
    balance: credits[0].balance || 0,
    dailyFreeCredits: credits[0].daily_free_credits || 3,
    dailyFreeUsed: credits[0].daily_free_used || 0,
    lastFreeDate: credits[0].last_free_credit_date
  }
}

/**
 * Update user credits in database
 */
export async function updateCreditsInDb(userId: string, newBalance: number): Promise<void> {
  const sql = getDb()
  const now = new Date().toISOString()
  
  await sql`
    UPDATE credits SET balance = ${newBalance}, updated_at = ${now}
    WHERE user_id = ${userId}
  `
  
  // Record the transaction
  await sql`
    INSERT INTO credit_transactions (user_id, type, amount, balance_after, created_at, description)
    VALUES (${userId}, 'sync', 0, ${newBalance}, ${now}, 'Balance sync')
  `
}

/**
 * Add credits to user account
 */
export async function addCreditsToDb(userId: string, amount: number, description: string = 'Credit added'): Promise<number> {
  const sql = getDb()
  const now = new Date().toISOString()
  
  // Get current balance
  const current = await getCreditsFromDb(userId)
  const newBalance = current.balance + amount
  
  // Update balance
  await sql`
    UPDATE credits SET balance = ${newBalance}, updated_at = ${now}
    WHERE user_id = ${userId}
  `
  
  // Record transaction
  await sql`
    INSERT INTO credit_transactions (user_id, type, amount, balance_after, created_at, description)
    VALUES (${userId}, 'add', ${amount}, ${newBalance}, ${now}, ${description})
  `
  
  return newBalance
}

/**
 * Use credits from user account
 */
export async function useCreditsFromDb(userId: string, amount: number, description: string = 'Analysis'): Promise<number> {
  const sql = getDb()
  const now = new Date().toISOString()
  
  // Get current balance
  const current = await getCreditsFromDb(userId)
  
  if (current.balance < amount) {
    throw new Error('Insufficient credits')
  }
  
  const newBalance = current.balance - amount
  
  // Update balance
  await sql`
    UPDATE credits SET balance = ${newBalance}, updated_at = ${now}
    WHERE user_id = ${userId}
  `
  
  // Record transaction
  await sql`
    INSERT INTO credit_transactions (user_id, type, amount, balance_after, created_at, description)
    VALUES (${userId}, 'use', ${-amount}, ${newBalance}, ${now}, ${description})
  `
  
  return newBalance
}

/**
 * Sync local credits with database (merge strategy: use database as source of truth)
 */
export async function syncCredits(userId: string): Promise<UserCredits> {
  try {
    const dbCredits = await getCreditsFromDb(userId)
    
    // Update local storage
    localStorage.setItem(LOCAL_CREDITS_KEY, String(dbCredits.balance))
    
    return dbCredits
  } catch (e) {
    console.error('[SyncService] Failed to sync credits:', e)
    
    // Return local credits as fallback
    const localCredits = parseInt(localStorage.getItem(LOCAL_CREDITS_KEY) || '0', 10)
    return {
      balance: localCredits,
      dailyFreeCredits: 3,
      dailyFreeUsed: 0,
      lastFreeDate: null
    }
  }
}

/**
 * Save analysis to database
 */
export async function saveAnalysisToDb(
  userId: string,
  analysisType: 'topic' | 'stock' | 'positional',
  inputQuery: string,
  result: AnalysisReport | StockAnalysisReport | PositionalWarfareReport,
  creditCost: number,
  executionTimeMs: number
): Promise<number> {
  const sql = getDb()
  const now = new Date().toISOString()
  
  const inserted = await sql`
    INSERT INTO analyses (user_id, analysis_type, input_query, result, credit_cost, execution_time_ms, created_at, updated_at, model)
    VALUES (${userId}, ${analysisType}, ${inputQuery}, ${JSON.stringify(result)}, ${creditCost}, ${executionTimeMs}, ${now}, ${now}, 'gemini-2.0')
    RETURNING id
  `
  
  // Update user's total analyses count
  await sql`
    UPDATE users SET total_analyses_count = total_analyses_count + 1, updated_at = ${now}
    WHERE id = ${userId}
  `
  
  return inserted[0].id
}

/**
 * Get user's analysis history from database
 */
export async function getAnalysisHistoryFromDb(
  userId: string,
  analysisType?: 'topic' | 'stock' | 'positional',
  limit: number = 50
): Promise<any[]> {
  const sql = getDb()
  
  if (analysisType) {
    return sql`
      SELECT id, analysis_type, input_query, result, credit_cost, execution_time_ms, created_at
      FROM analyses
      WHERE user_id = ${userId} AND analysis_type = ${analysisType}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
  }
  
  return sql`
    SELECT id, analysis_type, input_query, result, credit_cost, execution_time_ms, created_at
    FROM analyses
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
}

/**
 * Convert database analysis to TopicHistoryEntry
 */
export function dbToTopicHistory(dbEntries: any[]): TopicHistoryEntry[] {
  return dbEntries
    .filter(e => e.analysis_type === 'topic')
    .map(e => ({
      id: e.id,
      topic: e.input_query,
      report: e.result as AnalysisReport
    }))
}

/**
 * Convert database analysis to StockHistoryEntry
 */
export function dbToStockHistory(dbEntries: any[]): StockHistoryEntry[] {
  return dbEntries
    .filter(e => e.analysis_type === 'stock')
    .map(e => ({
      id: e.id,
      query: e.input_query,
      report: e.result as StockAnalysisReport
    }))
}

/**
 * Migrate local data to database for newly registered user
 */
export async function migrateLocalDataToDb(userId: string): Promise<void> {
  const sql = getDb()
  const now = new Date().toISOString()
  
  try {
    // Migrate topic history
    const topicHistory = localStorage.getItem('gemini-analysis-history')
    if (topicHistory) {
      const entries: TopicHistoryEntry[] = JSON.parse(topicHistory)
      for (const entry of entries.slice(0, 20)) {
        await sql`
          INSERT INTO analyses (user_id, analysis_type, input_query, result, credit_cost, created_at, updated_at, model)
          VALUES (${userId}, 'topic', ${entry.topic}, ${JSON.stringify(entry.report)}, 1, ${now}, ${now}, 'gemini-2.0')
          ON CONFLICT DO NOTHING
        `
      }
    }
    
    // Migrate stock history
    const stockHistory = localStorage.getItem('gemini-stock-analysis-history')
    if (stockHistory) {
      const entries: StockHistoryEntry[] = JSON.parse(stockHistory)
      for (const entry of entries.slice(0, 20)) {
        await sql`
          INSERT INTO analyses (user_id, analysis_type, input_query, result, credit_cost, created_at, updated_at, model)
          VALUES (${userId}, 'stock', ${entry.query}, ${JSON.stringify(entry.report)}, 1, ${now}, ${now}, 'gemini-2.0')
          ON CONFLICT DO NOTHING
        `
      }
    }
    
    // Migrate local credits
    const localCredits = parseInt(localStorage.getItem('gemini-claude-credits') || '0', 10)
    if (localCredits > 0) {
      await addCreditsToDb(userId, localCredits, 'Migrated from local storage')
    }
    
    // Mark user as migrated
    await sql`
      UPDATE users SET migrated_from_local = true, migration_date = ${now}
      WHERE id = ${userId}
    `
    
    console.log('[SyncService] Local data migrated successfully')
  } catch (e) {
    console.error('[SyncService] Migration failed:', e)
  }
}

/**
 * Full sync - pull all data from database
 */
export async function fullSync(userId: string): Promise<{
  credits: UserCredits
  topicHistory: TopicHistoryEntry[]
  stockHistory: StockHistoryEntry[]
}> {
  const [credits, analyses] = await Promise.all([
    getCreditsFromDb(userId),
    getAnalysisHistoryFromDb(userId)
  ])
  
  const topicHistory = dbToTopicHistory(analyses)
  const stockHistory = dbToStockHistory(analyses)
  
  // Update sync status
  const syncStatus: SyncStatus = {
    lastSyncAt: Date.now(),
    pendingChanges: 0,
    syncInProgress: false
  }
  localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(syncStatus))
  
  return { credits, topicHistory, stockHistory }
}

/**
 * Get sync status
 */
export function getSyncStatus(): SyncStatus {
  try {
    const stored = localStorage.getItem(SYNC_STATUS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('[SyncService] Failed to get sync status:', e)
  }
  
  return {
    lastSyncAt: 0,
    pendingChanges: 0,
    syncInProgress: false
  }
}
