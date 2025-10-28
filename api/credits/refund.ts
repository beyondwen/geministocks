// api/credits/refund.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { db } from '../_lib/db';
import { credits, creditTransactions } from '../../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
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

    const result = await db.transaction(async (tx) => {
      // Find the last 'analysis_use' transaction for this user
      const [lastTx] = await tx.select()
        .from(creditTransactions)
        .where(and(
          eq(creditTransactions.userId, userId),
          eq(creditTransactions.type, 'analysis_use')
        ))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(1);

      if (!lastTx) {
        // No transaction to refund, this is not an error.
        return { message: "No recent transaction to refund." };
      }

      // Check if this transaction has already been refunded
      const [existingRefund] = await tx.select()
        .from(creditTransactions)
        .where(and(
            eq(creditTransactions.userId, userId),
            eq(creditTransactions.type, 'refund'),
            sql`metadata->>'refundedTxId' = ${lastTx.id}`
        ))
        .limit(1);

      if (existingRefund) {
        return { message: "Transaction already refunded." };
      }
      
      const refundAmount = Math.abs(lastTx.amount);
      const wasDailyFree = (lastTx.metadata as any)?.usedDailyFree;

      let newBalance: number;
      let newDailyFreeUsed: number;
      
      // Get current credits to update
      const [userCredit] = await tx.select().from(credits).where(eq(credits.userId, userId)).for('update').limit(1);
      if (!userCredit) throw new Error("User credits not found for refund.");

      if (wasDailyFree) {
        // Refund a daily credit
        newDailyFreeUsed = Math.max(0, userCredit.dailyFreeUsed - refundAmount);
        newBalance = userCredit.balance;
        await tx.update(credits).set({ dailyFreeUsed: newDailyFreeUsed }).where(eq(credits.userId, userId));
      } else {
        // Refund a paid credit
        newBalance = userCredit.balance + refundAmount;
        newDailyFreeUsed = userCredit.dailyFreeUsed;
        await tx.update(credits).set({ balance: newBalance }).where(eq(credits.userId, userId));
      }

      // Create a refund transaction
      await tx.insert(creditTransactions).values({
        userId,
        type: 'refund',
        amount: refundAmount,
        balanceAfter: newBalance,
        description: `Refund for failed analysis (Tx: ${lastTx.id})`,
        metadata: { refundedTxId: lastTx.id }
      });

      return { refundAmount, newBalance, newDailyFreeUsed };
    });

    return success(res, result);
  } catch (err) {
    console.error('Refund error:', err);
    return error(res, err instanceof Error ? err.message : 'Internal server error', 500);
  }
}