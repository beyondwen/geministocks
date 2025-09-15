// This is a Vercel Serverless Function, which runs on the server.
// It requires Vercel KV to be set up and connected to the project.
// Environment variables: KV_REST_API_URL, KV_REST_API_TOKEN

import { randomUUID } from 'crypto';

interface VercelResponse {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  json: (body: any) => void;
  send: (body: string) => void;
}

interface VercelRequest {
  method: string;
  body: any;
  query: { [key: string]: string | string[] };
}

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

/**
 * A simple fetch-based client for Vercel KV to execute commands.
 */
async function kv(command: string, ...args: (string | number)[]) {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error('KV database is not configured.');
  }
  
  const url = `${KV_URL}/${[command, ...args].join('/')}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KV command failed: ${errorText}`);
  }

  return response.json();
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS and cache headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).send('');
  }

  try {
    if (req.method === 'POST') {
      const { report, topic } = req.body;
      if (!report || !topic) {
        return res.status(400).json({ error: 'Report and topic are required.' });
      }
      const id = randomUUID();
      // Store report and topic, key expires in 30 days (2592000 seconds)
      await kv('set', `report:${id}`, JSON.stringify({ report, topic }), 'EX', 2592000);
      return res.status(201).json({ id });
    }
  
    if (req.method === 'GET') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Report ID is required.' });
      }
      const data = await kv('get', `report:${id}`);
      const result = data.result;

      if (result) {
        return res.status(200).json(JSON.parse(result));
      } else {
        return res.status(404).json({ error: 'Report not found.' });
      }
    }
  
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Error with reports handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
  }
}
