// api/webhooks/clerk.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Webhook } from 'svix';
import { db } from '../_lib/db';
import { users, credits, userSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type { WebhookEvent } from '@clerk/clerk-sdk-node';

// Vercel's edge runtime does not support Buffer
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Missing CLERK_WEBHOOK_SECRET');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const svix_id = req.headers['svix-id'] as string;
    const svix_timestamp = req.headers['svix-timestamp'] as string;
    const svix_signature = req.headers['svix-signature'] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return res.status(400).json({ error: 'Missing svix headers' });
    }

    const wh = new Webhook(webhookSecret);
    let evt: WebhookEvent;

    // Vercel Edge functions parse body automatically. For Node, we might need to handle raw body.
    // Assuming the body is already parsed JSON by Vercel.
    const payload = JSON.stringify(req.body);
    
    try {
        evt = wh.verify(payload, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { id, ...attributes } = evt.data;
    const eventType = evt.type;
    
    await db.transaction(async (tx) => {
        if (eventType === 'user.created') {
            const email = (attributes as any).email_addresses?.[0]?.email_address;
            if (!email) {
                console.error('User created without an email address:', id);
                return; // Or handle as an error
            }
            const username = (attributes as any).username;
            const avatarUrl = (attributes as any).image_url;

            // Use ON CONFLICT DO NOTHING to handle potential race conditions
            await tx.insert(users).values({
                id: id as string,
                email: email,
                username: username || null,
                avatarUrl: avatarUrl || null,
            }).onConflictDoNothing();

            await tx.insert(credits).values({ userId: id as string }).onConflictDoNothing();
            await tx.insert(userSettings).values({ userId: id as string }).onConflictDoNothing();

            console.log('User created:', id);
        }

        if (eventType === 'user.updated') {
            const email = (attributes as any).email_addresses?.[0]?.email_address;
            const username = (attributes as any).username;
            const avatarUrl = (attributes as any).image_url;

            await tx.update(users)
                .set({
                    email: email || '',
                    username: username || null,
                    avatarUrl: avatarUrl || null,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, id as string));
            console.log('User updated:', id);
        }

        if (eventType === 'user.deleted') {
            // Clerk's cascade should handle this, but for completeness:
            await tx.delete(users).where(eq(users.id, id as string));
            console.log('User deleted:', id);
        }
    });

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
