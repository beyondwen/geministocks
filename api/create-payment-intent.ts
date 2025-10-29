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
    packageId?: 'pack_5_usd' | 'pack_18_usd' | 'pack_30_usd';
    subscriptionId?: 'pro_monthly_usd';
  };
}

// Define the pricing for each package in cents (USD)
const packagePrices: { [key: string]: number } = {
    'pack_5_usd': 100,      // $1.00 for 5 credits
    'pack_18_usd': 300,     // $3.00 for 18 credits
    'pack_30_usd': 400,     // $4.00 for 30 credits
};

const subscriptionPrices: { [key: string]: number } = {
    'pro_monthly_usd': 500 // $5.00 for pro subscription
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
    const { packageId, subscriptionId } = req.body;
    let amount: number | undefined;
    let metadata: { [key: string]: string } = {};

    if (packageId) {
        amount = packagePrices[packageId];
        metadata.packageId = packageId;
    } else if (subscriptionId) {
        amount = subscriptionPrices[subscriptionId];
        metadata.subscriptionId = subscriptionId;
    }

    if (!amount) {
      return res.status(400).json({ error: { message: 'Invalid package or subscription selected.' } });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    
    // Create a PaymentIntent with the dynamically calculated amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd', // Changed currency to US Dollars
      automatic_payment_methods: {
        enabled: true,
      },
      // IMPORTANT: Temporarily removed Alipay and WeChat Pay as the user's account does not support them.
      // Once activated in the Stripe Dashboard, these can be re-added.
      payment_method_types: ['card'],
      metadata,
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err: any) {
    console.error("Error creating payment intent:", err);
    res.status(500).json({ error: { message: err.message || 'An unknown error occurred while creating the payment.' } });
  }
}