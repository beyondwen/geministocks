import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchAllSources, NEWS_SOURCES, ENGLISH_FINANCE_SOURCES } from '../services/newsService'
import {
  buildArticlePrompt,
  buildSentimentInstruction,
  buildTacoInstruction,
  parseSentimentResponse,
  parseTacoResponse,
  type ScanArticle,
} from '../utils/indicatorScanShared'

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
 */

const MODEL = 'openai/gpt-5-mini'
const DEFAULT_BUFFETT_PERCENTILE = 85

/** Extract the first JSON object from an AI response (tolerates code fences). */
const parseAiJson = (content: string): any => {
  const stripped = content.replace(/```(?:json)?/g, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('No JSON object in AI response')
  return JSON.parse(stripped.slice(start, end + 1))
}

const callOpenRouter = async (prompt: string, systemInstruction: string): Promise<any> => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  })
  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`)
  }
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')
  return parseAiJson(content)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!process.env.OPENROUTER_API_KEY) {
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    return res.status(503).json({ error: 'Precompute not configured' })
  }

  const locale: 'zh' | 'en' = req.query.locale === 'en' ? 'en' : 'zh'

  try {
    // Server-side news window: display sources + EN finance pack (no CORS server-side).
    const sourceMap = new Map([...NEWS_SOURCES, ...ENGLISH_FINANCE_SOURCES].map(s => [s.id, s]))
    const newsArticles = await fetchAllSources([...sourceMap.values()], 4, 28)
    const articles: ScanArticle[] = newsArticles.map(a => ({
      title: a.title,
      description: a.description,
      sourceName: a.sourceName,
    }))
    const prompt = buildArticlePrompt(articles)
    const scannedAt = new Date().toISOString()

    // Both scans in parallel, same news window
    const [sentimentRaw, tacoRaw] = await Promise.all([
      callOpenRouter(prompt, buildSentimentInstruction(locale)),
      callOpenRouter(prompt, buildTacoInstruction(locale)),
    ])

    const envPercentile = Number(process.env.BUFFETT_PERCENTILE)
    const buffettPercentile =
      Number.isFinite(envPercentile) && envPercentile >= 0 && envPercentile <= 100
        ? envPercentile
        : DEFAULT_BUFFETT_PERCENTILE

    // CDN cache: fresh 6h, serve stale up to 24h while revalidating in background
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400')
    return res.status(200).json({
      sentiment: parseSentimentResponse(sentimentRaw, articles.length, scannedAt),
      taco: parseTacoResponse(tacoRaw, articles.length, scannedAt),
      buffettPercentile,
      generatedAt: scannedAt,
    })
  } catch (error) {
    console.error('[API] indicators precompute failed:', error instanceof Error ? error.message : error)
    // Short cache so a transient failure doesn't stick for 6 hours
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    return res.status(503).json({ error: 'Indicator precompute temporarily unavailable' })
  }
}
