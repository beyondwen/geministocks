// Vercel Serverless Function: api/payment-status.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- Vercel KV Helper ---
const KV_URL = process.env.KV_URL;
const KV_TOKEN = process.env.KV_TOKEN;

async function kv(command: string, ...args: (string | number)[]) {
  if (!KV_URL || !KV_TOKEN) throw new Error('KV database is not configured.');
  const response = await fetch(`${KV_URL}/${command}/${args.join('/')}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: 'no-store', // Always get the latest status
  });
  if (!response.ok) throw new Error(`KV command failed: ${await response.text()}`);
  return response.json();
}
// --- End Vercel KV Helper ---


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    const result = await kv('get', `user:${userId}:paid`);
    const isPaid = result.result === 'true';
    return res.status(200).json({ paid: isPaid });
  } catch (error) {
    console.error('Error fetching payment status from KV:', error);
    // Gracefully handle cases where the KV store is not configured or fails
    return res.status(500).json({ error: 'Could not retrieve payment status.' });
  }
}