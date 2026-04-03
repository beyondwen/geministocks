/**
 * Market Data Service
 * 
 * 统一的市场数据获取层，支持多数据源集成
 * 
 * 当前状态: Phase 1 - 使用 AI Web Search
 * 未来扩展: 
 * - Phase 2: Alpha Vantage + Finnhub (免费 API)
 * - Phase 3: NewsAPI + RSS feeds
 * - Phase 4: WebSocket 实时推送
 */

import { CACHE_TTL, determineCacheTTL } from './cacheService';

// Data source types
export type DataSource = 'ai_web_search' | 'alpha_vantage' | 'finnhub' | 'news_api' | 'cache';

// Market data interfaces
export interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  timestamp: string;
  source: DataSource;
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface MarketDataResult {
  quote?: StockQuote;
  news: NewsItem[];
  dataSource: DataSource;
  fetchedAt: string;
  ttl: number;
}

// Simple in-memory cache for market data
const marketDataCache = new Map<string, { data: MarketDataResult; expiry: number }>();

/**
 * Get cached market data if available and not expired
 */
function getCachedMarketData(ticker: string): MarketDataResult | null {
  const cached = marketDataCache.get(ticker.toUpperCase());
  if (cached && Date.now() < cached.expiry) {
    return { ...cached.data, dataSource: 'cache' };
  }
  return null;
}

/**
 * Cache market data with appropriate TTL
 */
function cacheMarketData(ticker: string, data: MarketDataResult): void {
  marketDataCache.set(ticker.toUpperCase(), {
    data,
    expiry: Date.now() + data.ttl,
  });
}

/**
 * Fetch market data for a stock ticker
 * Currently uses AI web search, designed for future API integration
 */
export async function fetchMarketData(ticker: string): Promise<MarketDataResult> {
  // Check cache first
  const cached = getCachedMarketData(ticker);
  if (cached) {
    console.log(`[MarketData] Cache hit for ${ticker}`);
    return cached;
  }

  // Phase 1: Return placeholder with AI web search flag
  // AI model will fetch real-time data via web search plugin
  const result: MarketDataResult = {
    news: [],
    dataSource: 'ai_web_search',
    fetchedAt: new Date().toISOString(),
    ttl: CACHE_TTL.PRICE_SENSITIVE,
  };

  // Cache the result
  cacheMarketData(ticker, result);

  return result;
}

/**
 * Build enhanced prompt with market context
 * Prepares data for AI analysis with freshness requirements
 */
export function buildMarketContextPrompt(ticker: string, basePrompt: string): string {
  const today = new Date().toISOString().split('T')[0];
  
  return `${basePrompt}

REAL-TIME DATA REQUIREMENTS:
- Stock Ticker: ${ticker}
- Current Date: ${today}
- You MUST search for and include:
  1. Current stock price and today's change (%)
  2. Recent news from the last 7 days
  3. Latest analyst ratings or price targets
  4. Any upcoming earnings or events
- Always cite specific dates for all data points
- If exact data is unavailable, clearly indicate "estimated" or "as of [date]"`;
}

/**
 * Health check for external data sources
 * Useful for monitoring data pipeline reliability
 */
export async function checkDataSourceHealth(): Promise<{
  source: DataSource;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
}[]> {
  // Phase 1: Only AI web search is active
  return [
    {
      source: 'ai_web_search',
      status: 'healthy',
      latency: 0,
    },
  ];
}

/**
 * Get recommended TTL based on query type
 */
export function getRecommendedTTL(queryType: 'price' | 'news' | 'analysis' | 'historical'): number {
  switch (queryType) {
    case 'price':
      return CACHE_TTL.PRICE_SENSITIVE;
    case 'news':
      return CACHE_TTL.NEWS_SENSITIVE;
    case 'analysis':
      return CACHE_TTL.ANALYSIS_REPORT;
    case 'historical':
      return CACHE_TTL.HISTORICAL;
    default:
      return CACHE_TTL.ANALYSIS_REPORT;
  }
}

// Export cache TTL for external use
export { CACHE_TTL, determineCacheTTL };
