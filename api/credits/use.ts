// api/credits/use.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { db } from '../_lib/db';
import { credits, creditTransactions } from '../../db/schema';
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

    const { amount, model, analysisId, description, isDailyFreeUse } = req.body;

    if (!amount || amount <= 0) {
      return error(res, 'Invalid amount', 400);
    }
    
    // Use a database transaction for atomicity
    const result = await db.transaction(async (tx) => {
        // Get user's current credit status with a row-level lock
        const [userCredit] = await tx.select().from(credits).where(eq(credits.userId, userId)).for('update').limit(1);

        if (!userCredit) {
            throw new Error('User credits not found');
        }
        
        // Logic to handle credit usage
        const today = new Date().toISOString().split('T')[0];
        let usedDailyFree = false;
        let newBalance = userCredit.balance;
        let newDailyFreeUsed = userCredit.dailyFreeUsed;
        let newLastFreeCreditDate = userCredit.lastFreeCreditDate;
        
        const isNewDay = !userCredit.lastFreeCreditDate || userCredit.lastFreeCreditDate.split('T')[0] !== today;
        const availableFreeCredits = isNewDay
            ? userCredit.dailyFreeCredits
            : userCredit.dailyFreeCredits - userCredit.dailyFreeUsed;

        if (isDailyFreeUse) { // Explicitly using a daily credit
             if (availableFreeCredits < amount) {
                throw new Error('Insufficient daily free credits');
            }
            newDailyFreeUsed = isNewDay ? amount : userCredit.dailyFreeUsed + amount;
            usedDailyFree = true;
        } else { // Using paid credits
            if (userCredit.balance < amount) {
                throw new Error(`Insufficient credits. Balance: ${userCredit.balance}, Required: ${amount}`);
            }
            newBalance -= amount;
        }

        if (usedDailyFree) {
            newLastFreeCreditDate = today;
        }

        // Update credit balance in DB
        const [updatedCredit] = await tx.update(credits)
            .set({
                balance: newBalance,
                dailyFreeUsed: newDailyFreeUsed,
                lastFreeCreditDate: newLastFreeCreditDate,
                updatedAt: new Date(),
            })
            .where(eq(credits.userId, userId))
            .returning();
        
        // Record the transaction
        const [transaction] = await tx.insert(creditTransactions)
            .values({
                userId,
                type: 'analysis_use',
                amount: -amount,
                balanceAfter: newBalance,
                relatedAnalysisId: analysisId ? Number(analysisId) : undefined,
                description: description || `${model} analysis`,
                metadata: { model, usedDailyFree },
            })
            .returning();

        return { newBalance, transactionId: transaction.id, usedDailyFree, newDailyFreeUsed };
    });

    return success(res, result);
  } catch (err) {
    console.error('Use credits error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const code = message.includes('Insufficient') ? 'INSUFFICIENT_CREDITS' : undefined;
    return error(res, message, code ? 400 : 500, code);
  }
}
