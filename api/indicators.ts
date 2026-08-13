import type { VercelRequest, VercelResponse } from '@vercel/node'
import { computeIndicators } from '../services/indicatorPrecomputeCore'

/**
 * Precomputed indicators endpoint — "compute once, every visitor shares".
 *
 * GET /api/indicators?locale=zh|en
 *
 * Runs the MarketThermometer + TacoMonitor AI scans server-side with the
 * site's OPENROUTER_API_KEY, and lets the Vercel CDN cache the result for
 * 6 hours (stale-while-revalidate 24h). Token cost is bounded by cache
 * misses (~4/day x 2 locales), NOT by visitor count. Visitors see a live
 * dashboard without configuring their own model.
 *
 * The compute core is shared with the Vite dev middleware (vite.config.ts)
 * so the preview environment behaves identically.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    return res.status(503).json({ error: 'Precompute not configured' })
  }

  const locale: 'zh' | 'en' = req.query.locale === 'en' ? 'en' : 'zh'

  try {
    const payload = await computeIndicators(locale, apiKey, process.env.BUFFETT_PERCENTILE, process.env.INDICATORS_MODEL)
    // CDN cache: fresh 6h, serve stale up to 24h while revalidating in background
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400')
    return res.status(200).json(payload)
  } catch (error) {
    console.error('[API] indicators precompute failed:', error instanceof Error ? error.message : error)
    // Short cache so a transient failure doesn't stick for 6 hours
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    return res.status(503).json({ error: 'Indicator precompute temporarily unavailable' })
  }
}
