// Client for the site-precomputed indicators endpoint (/api/indicators).
// "Compute once, every visitor shares": the server scans with the site's key
// and the CDN caches the result, so visitors see live indicators with zero
// configuration. Fails soft: any error returns null and components fall back
// to the existing manual-scan mode (e.g. local vite dev has no serverless).

import type { SentimentScanResult } from '../utils/sentimentUtils';
import type { TacoScanResult } from '../utils/tacoUtils';

export interface PrecomputedIndicators {
  sentiment: SentimentScanResult;
  taco: TacoScanResult;
  buffettPercentile: number;
  generatedAt: string;
}

// One in-flight request per locale, shared by both indicator components.
const cache = new Map<string, Promise<PrecomputedIndicators | null>>();

export const fetchPrecomputedIndicators = (locale: 'zh' | 'en'): Promise<PrecomputedIndicators | null> => {
  const existing = cache.get(locale);
  if (existing) return existing;

  const promise: Promise<PrecomputedIndicators | null> = (async () => {
    try {
      const res = await fetch(`/api/indicators?locale=${locale}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.sentiment || !data?.taco || typeof data.sentiment.newsScore !== 'number' || !Array.isArray(data.taco.signals)) {
        return null;
      }
      return {
        sentiment: data.sentiment as SentimentScanResult,
        taco: data.taco as TacoScanResult,
        buffettPercentile:
          typeof data.buffettPercentile === 'number' && data.buffettPercentile >= 0 && data.buffettPercentile <= 100
            ? data.buffettPercentile
            : 85,
        generatedAt: String(data.generatedAt || new Date().toISOString()),
      };
    } catch {
      return null; // graceful degradation to manual mode
    }
  })();

  cache.set(locale, promise);
  return promise;
};
