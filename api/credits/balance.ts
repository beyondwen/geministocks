// api/credits/balance.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { db } from '../_lib/db';
import { credits, creditTransactions } from '../../db/schema';
import { eq } from 'drizzle-orm';
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

    let awardedAmount = 0;

    // Use a transaction to ensure atomic operations
    const result = await db.transaction(async (tx) => {
        let [userCredit] = await tx.select().from(credits).where(eq(credits.userId, userId)).limit(1);

        // If the user has no credit record, create one
        if (!userCredit) {
            [userCredit] = await tx.insert(credits)
                .values({ userId, balance: 0, dailyFreeCredits: 5, dailyFreeUsed: 0 })
                .returning();
        }

        // Check if daily free credits need to be awarded/reset
        const today = new Date().toISOString().split('T')[0];
        const lastAwardDate = userCredit.lastFreeCreditDate ? userCredit.lastFreeCreditDate.split('T')[0] : null;

        if (lastAwardDate !== today) {
            awardedAmount = userCredit.dailyFreeCredits;
            await tx.update(credits)
                .set({
                    dailyFreeUsed: 0,
                    lastFreeCreditDate: today,
                })
                .where(eq(credits.userId, userId));
            
            // Refetch to get updated values
            [userCredit] = await tx.select().from(credits).where(eq(credits.userId, userId)).limit(1);
        }

        return userCredit;
    });

    return success(res, {
      balance: result.balance,
      dailyFreeCredits: result.dailyFreeCredits,
      dailyFreeUsed: result.dailyFreeUsed,
      dailyFreeRemaining: result.dailyFreeCredits - result.dailyFreeUsed,
      lastFreeAwardDate: result.lastFreeCreditDate,
      awarded: awardedAmount,
    });
  } catch (err) {
    console.error('Get balance error:', err);
    return error(res, 'Internal server error', 500);
  }
}
