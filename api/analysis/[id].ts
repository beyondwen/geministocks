// api/analysis/[id].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { db } from '../_lib/db';
import { analyses, users } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { success, error, unauthorized, methodNotAllowed } from '../_lib/response';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return methodNotAllowed(res);
  }

  try {
    const userId = await authenticateRequest(req);
    if (!userId) {
      return unauthorized(res);
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return error(res, 'Missing or invalid analysis ID', 400);
    }

    const analysisId = parseInt(id, 10);
    if (isNaN(analysisId)) {
        return error(res, 'Invalid analysis ID format', 400);
    }

    const result = await db.transaction(async (tx) => {
        // Delete the analysis record, ensuring it belongs to the authenticated user
        const deleted = await tx.delete(analyses)
          .where(and(
            eq(analyses.id, analysisId),
            eq(analyses.userId, userId)
          ))
          .returning();

        if (deleted.length === 0) {
          // Either analysis not found or user is not authorized
          return null;
        }

        // Decrement the user's total analysis count, ensuring it doesn't go below zero
        await tx.update(users)
            .set({ totalAnalysesCount: sql`greatest(0, ${users.totalAnalysesCount} - 1)` })
            .where(eq(users.id, userId));
        
        return { deleted: true };
    });

    if (result === null) {
      return error(res, 'Analysis not found or unauthorized', 404);
    }

    return success(res, result);
  } catch (err) {
    console.error('Delete analysis error:', err);
    return error(res, 'Internal server error', 500);
  }
}
