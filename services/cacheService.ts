import type { AnalysisReport, StockAnalysisReport } from '../types'

/**
 * 分析缓存服务
 * 使用内存缓存 + 时间戳来减少 AI API 调用
 * 相同查询 24 小时内复用结果
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // milliseconds
}

class CacheManager<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private readonly defaultTTL = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * 生成缓存键 - 基于查询内容进行哈希
   */
  private generateKey(query: string): string {
    // 简单的哈希函数，将查询正规化后生成键
    const normalized = query.toLowerCase().trim()
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为 32-bit 整数
    }
    return `cache_${Math.abs(hash).toString(36)}`
  }

  /**
   * 从缓存获取数据
   */
  get(query: string): T | null {
    const key = this.generateKey(query)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // 检查是否过期
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    console.log(`[v0] Cache hit for query: ${query.substring(0, 50)}...`)
    return entry.data
  }

  /**
   * 存储数据到缓存
   */
  set(query: string, data: T, ttl: number = this.defaultTTL): void {
    const key = this.generateKey(query)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
    console.log(`[v0] Cached analysis for query: ${query.substring(0, 50)}...`)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    console.log('[v0] Cache cleared')
  }

  /**
   * 清理过期缓存条目
   */
  cleanup(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`[v0] Cleaned up ${removed} expired cache entries`)
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // 可以扩展为追踪 hit/miss 比率
    }
  }
}

// 创建专用缓存管理器
export const topicAnalysisCache = new CacheManager<AnalysisReport>()
export const stockAnalysisCache = new CacheManager<StockAnalysisReport>()

/**
 * 定期清理过期缓存（每小时一次）
 */
export function initCacheCleanup(): void {
  setInterval(() => {
    topicAnalysisCache.cleanup()
    stockAnalysisCache.cleanup()
  }, 60 * 60 * 1000)

  console.log('[v0] Cache cleanup scheduled')
}

/**
 * 清空所有缓存
 */
export function clearAllCaches(): void {
  topicAnalysisCache.clear()
  stockAnalysisCache.clear()
}

export { CacheManager }
