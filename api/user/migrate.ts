// api/user/migrate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { db } from '../_lib/db';
import { users, credits, analyses, creditTransactions } from '../../db/schema';
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

    const { localData } = req.body;

    if (!localData) {
      return error(res, 'Missing local data', 400);
    }

    // Use a transaction to ensure all or nothing
    const migrationResult = await db.transaction(async (tx) => {
        const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
        if (user?.migratedFromLocal) {
            // This isn't an error, just means it's already done.
            return { migratedCredits: 0, migratedAnalyses: 0, message: 'User already migrated' };
        }

        let migratedAnalyses = 0;
        let migratedCredits = 0;

        // Combine all history items with their type
        const allHistory = [
            ...(localData.topicHistory || []).map((item: any) => ({ ...item, type: 'topic' })),
            ...(localData.stockHistory || []).map((item: any) => ({ ...item, type: 'stock' })),
            ...(localData.positionalWarfareHistory || []).map((item: any) => ({ ...item, type: 'positional_warfare' })),
        ];

        // Sort by timestamp to insert in chronological order
        allHistory.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        for (const item of allHistory) {
            let inputQuery = '';
            if (item.type === 'topic') inputQuery = item.topic || '';
            else if (item.type === 'stock') inputQuery = item.query || '';
            else if (item.type === 'positional_warfare') inputQuery = item.leaderStockQuery || '';

            if (item.report && inputQuery) {
                await tx.insert(analyses).values({
                    userId,
                    analysisType: item.type,
                    inputQuery,
                    model: 'deepseek', // Assume default model for old records
                    creditCost: 1,     // Assume default cost
                    result: item.report,
                    createdAt: item.timestamp ? new Date(item.timestamp) : new Date(),
                });
                migratedAnalyses++;
            }
        }

        // Migrate credits
        if (localData.credits && localData.credits > 0) {
            const [userCredit] = await tx.select().from(credits).where(eq(credits.userId, userId)).limit(1);
            let finalBalance = 0;
            if (userCredit) {
                const updated = await tx.update(credits)
                    .set({ balance: sql`${credits.balance} + ${localData.credits}` })
                    .where(eq(credits.userId, userId))
                    .returning({ newBalance: credits.balance });
                finalBalance = updated[0].newBalance;
            } else {
                 const inserted = await tx.insert(credits).values({ userId, balance: localData.credits }).returning({ newBalance: credits.balance });
                 finalBalance = inserted[0].newBalance;
            }
            migratedCredits = localData.credits;
            
            // Create a transaction record for the migration
            await tx.insert(creditTransactions).values({
                userId,
                type: 'migration',
                amount: migratedCredits,
                balanceAfter: finalBalance,
                description: 'Migrated credits from local storage'
            });
        }
        
        // Mark user as migrated and update total analyses count
        await tx.update(users)
          .set({
            migratedFromLocal: true,
            migrationDate: new Date(),
            totalAnalysesCount: sql`${users.totalAnalysesCount} + ${migratedAnalyses}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        return { migratedCredits, migratedAnalyses, message: '数据迁移成功' };
    });

    return success(res, migrationResult);
  } catch (err) {
    console.error('Migration error:', err);
    return error(res, err instanceof Error ? err.message : 'Internal server error', 500);
  }
}
