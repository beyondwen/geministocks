// api/create-payment-intent.ts
// This is a Vercel Serverless Function, which runs on the server.
// It requires the Stripe SDK and an environment variable STRIPE_SECRET_KEY.

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
  body: {
    packageId?: 'pack_1' | 'pack_5' | 'pack_10';
  };
}

// Define the pricing for each package in cents
const packagePrices: { [key: string]: number } = {
    'pack_1': 100,  // $1.00 for 1 credit
    'pack_5': 450,  // $4.50 for 5 credits (10% discount)
    'pack_10': 800, // $8.00 for 10 credits (20% discount)
};

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
    const { packageId = 'pack_1' } = req.body; // Default to single pack if not provided
    const amount = packagePrices[packageId];

    if (!amount) {
      return res.status(400).json({ error: { message: 'Invalid credit package selected.' } });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    
    // Create a PaymentIntent with the dynamically calculated amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      // Add metadata to track the purchase
      metadata: {
        packageId: packageId
      }
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err: any) {
    console.error("Error creating payment intent:", err);
    res.status(500).json({ error: { message: err.message || 'An unknown error occurred while creating the payment.' } });
  }
}