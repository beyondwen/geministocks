// Vercel Serverless Function: api/stripe-webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { Readable } from 'node:stream';
// FIX: Import Buffer to resolve 'Cannot find name' error in Node.js serverless environment.
import { Buffer } from 'node:buffer';

// --- Vercel KV Helper ---
const KV_URL = process.env.KV_URL;
const KV_TOKEN = process.env.KV_TOKEN;

async function kv(command: string, ...args: (string | number)[]) {
  if (!KV_URL || !KV_TOKEN) throw new Error('KV database is not configured.');
  const response = await fetch(`${KV_URL}/${command}/${args.join('/')}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`KV command failed: ${await response.text()}`);
  return response.json();
}
// --- End Vercel KV Helper ---

// This config is necessary for Stripe's webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: Readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (!webhookSecret) {
      console.error('Stripe webhook secret is not set.');
      return res.status(500).send('Webhook secret is not configured.');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig!, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${message}`);
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  // Handle the 'checkout.session.completed' event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Retrieve our internal user ID from the session
    const userId = session.client_reference_id;

    if (!userId) {
        console.error('Webhook received without a client_reference_id (userId).');
        // Still return 200 to Stripe, but log the issue.
        return res.status(200).json({ received: true, error: "Missing userId" });
    }
    
    try {
      // Save the paid status to our database (Vercel KV)
      await kv('set', `user:${userId}:paid`, 'true');
      console.log(`Successfully recorded payment for user: ${userId}`);
    } catch (dbError) {
      console.error('Failed to update user payment status in KV:', dbError);
      // If the database update fails, we should return a 500 to signal Stripe to retry.
      return res.status(500).json({ error: 'Failed to update database.' });
    }
  }

  // Acknowledge receipt of the event
  res.status(200).json({ received: true });
}