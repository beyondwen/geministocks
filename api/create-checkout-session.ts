// Vercel Serverless Function: api/create-checkout-session.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const APP_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (!process.env.STRIPE_SECRET_KEY || !PRICE_ID) {
    return res.status(500).json({ error: 'Stripe is not configured correctly.' });
  }

  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'payment',
      // We use query parameters to handle success and cancellation on the client side.
      success_url: `${APP_URL}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/?payment_cancel=true`,
      // Associate the checkout session with our internal user ID
      client_reference_id: userId,
    });

    if (!session.id) {
        throw new Error('Could not create a Stripe session ID.');
    }

    return res.status(200).json({ sessionId: session.id });

  } catch (err) {
    console.error('Error creating Stripe session:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
}