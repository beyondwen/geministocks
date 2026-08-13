// Environment-agnostic core of the precomputed-indicators feature.
// Used by BOTH the Vercel serverless function (api/indicators.ts) and the
// Vite dev middleware (vite.config.ts), so the preview behaves like prod:
// visitors see indicators computed with the site's OPENROUTER_API_KEY,
// with zero model configuration.

import { fetchAllSources, NEWS_SOURCES, ENGLISH_FINANCE_SOURCES } from './newsService';
import {
  buildArticlePrompt,
  buildSentimentInstruction,
  buildTacoInstruction,
  parseSentimentResponse,
  parseTacoResponse,
  type ScanArticle,
} from '../utils/indicatorScanShared';
import type { SentimentScanResult } from '../utils/sentimentUtils';
import type { TacoScanResult } from '../utils/tacoUtils';

/**
 * Preferred model, tried first (override with INDICATORS_MODEL env var).
 * If it fails with 402 (no credit) or 404 (retired), free-tier models are
 * DISCOVERED at runtime from the OpenRouter /models API instead of being
 * hardcoded — free model IDs rotate too fast to pin in code.
 */
const PREFERRED_MODEL = 'openai/gpt-5-mini';
const DEFAULT_BUFFETT_PERCENTILE = 85;

/** Capability heuristics for ranking discovered free models (best first). */
const FREE_MODEL_PREFERENCE = [/ultra/i, /super/i, /gemma-4-31b/i, /gpt-oss/i, /reasoning/i];

let freeModelsCache: { ids: string[]; at: number } | null = null;
const FREE_MODELS_TTL_MS = 60 * 60 * 1000;

/** Discover currently-available free models on the key, ranked by capability. */
const discoverFreeModels = async (apiKey: string): Promise<string[]> => {
  if (freeModelsCache && Date.now() - freeModelsCache.at < FREE_MODELS_TTL_MS) {
    return freeModelsCache.ids;
  }
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`OpenRouter models error: ${response.status}`);
  const data = await response.json();
  const free: string[] = (data?.data || [])
    .map((m: any) => String(m?.id || ''))
    .filter((id: string) => id.endsWith(':free'));
  const rank = (id: string) => {
    const i = FREE_MODEL_PREFERENCE.findIndex(re => re.test(id));
    return i === -1 ? FREE_MODEL_PREFERENCE.length : i;
  };
  free.sort((a, b) => rank(a) - rank(b));
  freeModelsCache = { ids: free, at: Date.now() };
  return free;
};

export interface PrecomputedIndicatorsPayload {
  sentiment: SentimentScanResult;
  taco: TacoScanResult;
  buffettPercentile: number;
  generatedAt: string;
}

/** Extract the first JSON object from an AI response (tolerates code fences). */
const parseAiJson = (content: string): any => {
  const stripped = content.replace(/```(?:json)?/g, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in AI response');
  return JSON.parse(stripped.slice(start, end + 1));
};

const callModel = async (
  prompt: string,
  systemInstruction: string,
  apiKey: string,
  model: string
): Promise<any> => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });
  if (!response.ok) {
    const err = new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
    (err as any).status = response.status;
    throw err;
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty AI response');
  return parseAiJson(content);
};

/** Retriable statuses: 402 no credit, 404 retired, 429 rate limit on free tier. */
const isModelFallthrough = (err: unknown): boolean => {
  const status = (err as any)?.status;
  return status === 402 || status === 404 || status === 429;
};

/**
 * Try the preferred/override model first; on 402/404/429, discover free
 * models at runtime and try the top-ranked three. Other errors propagate.
 */
const callOpenRouter = async (
  prompt: string,
  systemInstruction: string,
  apiKey: string,
  modelOverride?: string
): Promise<any> => {
  const primary = modelOverride || PREFERRED_MODEL;
  let lastError: unknown;
  try {
    return await callModel(prompt, systemInstruction, apiKey, primary);
  } catch (err) {
    if (!isModelFallthrough(err)) throw err;
    lastError = err;
  }
  const freeModels = (await discoverFreeModels(apiKey)).filter(m => m !== primary).slice(0, 3);
  for (const model of freeModels) {
    try {
      return await callModel(prompt, systemInstruction, apiKey, model);
    } catch (err) {
      lastError = err;
      if (!isModelFallthrough(err)) throw err;
    }
  }
  throw lastError;
};

/**
 * Fetch the server-side news window and run both indicator scans in parallel.
 * Throws on failure — callers decide how to degrade.
 */
export const computeIndicators = async (
  locale: 'zh' | 'en',
  apiKey: string,
  buffettPercentileEnv?: string,
  modelOverride?: string
): Promise<PrecomputedIndicatorsPayload> => {
  // Display sources + EN finance pack, deduped by id (no CORS server-side)
  const sourceMap = new Map([...NEWS_SOURCES, ...ENGLISH_FINANCE_SOURCES].map(s => [s.id, s]));
  const newsArticles = await fetchAllSources([...sourceMap.values()], 4, 28);
  const articles: ScanArticle[] = newsArticles.map(a => ({
    title: a.title,
    description: a.description,
    sourceName: a.sourceName,
  }));
  const prompt = buildArticlePrompt(articles);
  const scannedAt = new Date().toISOString();

  const [sentimentRaw, tacoRaw] = await Promise.all([
    callOpenRouter(prompt, buildSentimentInstruction(locale), apiKey, modelOverride),
    callOpenRouter(prompt, buildTacoInstruction(locale), apiKey, modelOverride),
  ]);

  const envPercentile = Number(buffettPercentileEnv);
  const buffettPercentile =
    Number.isFinite(envPercentile) && envPercentile >= 0 && envPercentile <= 100
      ? envPercentile
      : DEFAULT_BUFFETT_PERCENTILE;

  return {
    sentiment: parseSentimentResponse(sentimentRaw, articles.length, scannedAt),
    taco: parseTacoResponse(tacoRaw, articles.length, scannedAt),
    buffettPercentile,
    generatedAt: scannedAt,
  };
};
