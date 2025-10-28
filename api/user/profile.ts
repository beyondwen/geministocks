// api/user/profile.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { db } from '../_lib/db';
import { users } from '../../db/schema';
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

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      // User might exist in Clerk but not yet in our DB (webhook latency)
      // We can decide to create it here, but for now, we'll let the webhook handle it.
      return error(res, 'User not found in our database. Please try again shortly.', 404);
    }

    return success(res, {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      totalAnalysesCount: user.totalAnalysesCount,
      migratedFromLocal: user.migratedFromLocal,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return error(res, 'Internal server error', 500);
  }
}
