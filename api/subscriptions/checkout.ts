/**
 * 创建订阅 Checkout Session
 * POST /api/subscriptions/checkout
 */

import { createSubscriptionCheckoutSession } from '../../services/stripeService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email, planId, stripePriceId, returnUrl } = req.body;

  if (!userId || !email || !planId || !stripePriceId || !returnUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const session = await createSubscriptionCheckoutSession(
      userId,
      email,
      planId,
      stripePriceId,
      returnUrl
    );

    return res.status(200).json({
      sessionId: session.id,
      clientSecret: session.client_secret,
      url: session.url,
    });
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    });
  }
}
