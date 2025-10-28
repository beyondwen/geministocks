// api/analysis/save.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { db } from '../_lib/db';
import { analyses, users } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { success, error, unauthorized, methodNotAllowed } from '../_lib/response';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  try {
    const userId = await authenticateRequest(req);
    if (!userId) {
      return unauthorized(res);
    }

    const { analysisType, inputQuery, model, creditCost, result, executionTimeMs } = req.body;

    if (!analysisType || !inputQuery || !model || !result) {
      return error(res, 'Missing required fields', 400);
    }

    const savedAnalysis = await db.transaction(async (tx) => {
        // Save the analysis record
        const [analysis] = await tx.insert(analyses)
          .values({
            userId,
            analysisType,
            inputQuery,
            model,
            creditCost: creditCost || 0,
            result,
            executionTimeMs,
          })
          .returning();

        // Update the user's total analysis count
        await tx.update(users)
          .set({
            totalAnalysesCount: sql`${users.totalAnalysesCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
        
        return analysis;
    });


    return success(res, {
      id: savedAnalysis.id,
      createdAt: savedAnalysis.createdAt,
    }, 201);
  } catch (err) {
    console.error('Save analysis error:', err);
    return error(res, 'Internal server error', 500);
  }
}
