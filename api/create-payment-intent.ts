// api/create-payment-intent.ts
// This is a Vercel Serverless Function, which runs on the server.
// It requires the Stripe SDK and an environment variable STRIPE_SECRET_KEY.

// FIX: Replaced require() with an ES module import to resolve TypeScript error.
import Stripe from 'stripe';

interface VercelResponse {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  json: (body: any) => void;
  send: (body: any) => void;
  end: () => void;
}

interface VercelRequest {
  method: string;
}

// In a real Vercel environment, you would add `stripe` to your package.json.
// The code here is written as if `require('stripe')` is available.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
      console.error("Stripe secret key is not set in environment variables.");
      return res.status(500).json({ error: { message: 'Payment provider is not configured on the server.' } });
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100, // $1.00 USD in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err: any) {
    console.error("Error creating payment intent:", err);
    res.status(500).json({ error: { message: err.message || 'An unknown error occurred while creating the payment.' } });
  }
}
