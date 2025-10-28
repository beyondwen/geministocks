// api/analysis/list.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { db } from '../_lib/db';
import { analyses } from '../../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { success, error, unauthorized, methodNotAllowed } from '../_lib/response';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res);
  }

  try {
    const userId = await authenticateRequest(req);
    if (!userId) {
      return unauthorized(res);
    }

    const { type = 'all', limit = '50', offset = '0' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    const conditions = [eq(analyses.userId, userId)];
    if (type !== 'all' && typeof type === 'string') {
      conditions.push(eq(analyses.analysisType, type));
    }

    const items = await db.select()
      .from(analyses)
      .where(and(...conditions))
      .orderBy(desc(analyses.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    const [{ count }] = await db.select({ count: sql`count(*)::int` })
      .from(analyses)
      .where(and(...conditions));

    return success(res, {
      items,
      total: count,
      hasMore: offsetNum + limitNum < count,
    });
  } catch (err) {
    console.error('List analyses error:', err);
    return error(res, 'Internal server error', 500);
  }
}
