// api/analyze.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from './_lib/auth';
import { success, error, unauthorized, methodNotAllowed } from './_lib/response';
import type { Locale } from '../hooks/useI18n';
import { 
    getAnalysis, 
    getStockAnalysis, 
    getPositionalWarfareAnalysis, 
    getHotStocksFromAI, 
    getPolymarketAnalysis 
} from './_lib/openRouter';

export type AnalysisModel = 'deepseek' | 'gemini' | 'claude';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  // Hot stocks are public, no auth needed
  if (req.body.type === 'hot_stocks') {
    try {
        const { model, locale } = req.body as { model: AnalysisModel, locale: Locale };
        const stocks = await getHotStocksFromAI(model, locale);
        return success(res, { stocks });
    } catch (err) {
        console.error('Hot stocks error:', err);
        return error(res, err instanceof Error ? err.message : 'Failed to fetch hot stocks', 500);
    }
  }

  // All other analyses require authentication
  const userId = await authenticateRequest(req);
  if (!userId) {
    return unauthorized(res);
  }

  try {
    const { type, query, model, locale } = req.body as { type: string, query: string, model: AnalysisModel, locale: Locale };

    let report;
    switch (type) {
      case 'topic':
        const isPolymarketUrl = /^https?:\/\/polymarket\.com\//.test(query.trim());
        report = isPolymarketUrl
            ? await getPolymarketAnalysis(query, model, locale)
            : await getAnalysis(query, model, locale);
        break;
      case 'stock':
        report = await getStockAnalysis(query, model, locale);
        break;
      case 'positional':
        // This one is special as it doesn't have a progress callback here
        report = await getPositionalWarfareAnalysis(query, () => {}, model, locale);
        break;
      default:
        return error(res, 'Invalid analysis type', 400);
    }

    return success(res, { report });

  } catch (err) {
    console.error(`Analysis error in /api/analyze for user ${userId}:`, err);
    return error(res, err instanceof Error ? err.message : 'An unknown error occurred during analysis', 500);
  }
}
