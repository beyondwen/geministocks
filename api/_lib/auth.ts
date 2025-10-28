// api/_lib/auth.ts
import type { VercelRequest } from '@vercel/node';
import { clerkClient } from '@clerk/clerk-sdk-node';

export async function authenticateRequest(req: VercelRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7);

    const payload = await clerkClient.verifyToken(token);
    
    if (!payload.sub) {
        return null;
    }

    return payload.sub; // Returns the user ID
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}
