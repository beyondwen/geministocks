
interface VercelResponse {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  json: (body: any) => void;
  send: (body: string) => void;
}

interface VercelRequest {
  method: string;
  body: {
    prompt: string;
    systemInstruction: string;
    modelName: string;
  };
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SITE_URL = 'https://mastersgo.cc';
const SITE_NAME = '超级挖掘机';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not set in environment variables.");
    return res.status(500).json({ error: 'Server configuration error: API Key missing.' });
  }

  try {
    const { prompt, systemInstruction, modelName } = req.body;

    if (!prompt || !modelName) {
      return res.status(400).json({ error: 'Missing required fields: prompt or modelName.' });
    }

    // Construct the request body for OpenRouter
    const requestBody: any = {
      model: modelName,
      messages: [
        { role: 'system', content: systemInstruction || '' },
        { role: 'user', content: prompt }
      ],
    };

    // Handle model-specific parameters for JSON output.
    // The Grok model via OpenRouter has issues with `tool_choice` and `response_format`.
    if (!modelName.startsWith('x-ai/grok')) {
        requestBody.response_format = { type: "json_object" };
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': encodeURIComponent(SITE_NAME),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API Error:', response.status, errorText);
      return res.status(response.status).json({ error: `OpenRouter API error: ${errorText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('Error in gemini proxy:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
