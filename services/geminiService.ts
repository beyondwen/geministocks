// services/geminiService.ts
import type { AnalysisReport, StockAnalysisReport } from '../types';

// --- OpenRouter Configuration ---
const API_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
// The API key is Base64 encoded for basic obfuscation in the client-side code.
const OPENROUTER_API_KEY_B64 = 'c2stb3ItdjEtYzJmMjVlMjFjZTQ5ODc5MGYwYTcwMmM4OTI3MTZmYjNlZDkzYzA1YWFjMGQwODAxZmZiMDEzOWFmYmNlNDZmNw==';
const SITE_URL = 'https://mastersgo.cc';
const SITE_NAME = '股市超级挖掘机';

/**
 * A generic helper function to call the OpenRouter API.
 * @param prompt The user's prompt/request.
 * @param systemInstruction The system-level instruction for the AI model.
 * @param modelName The name of the model to use.
 * @returns The JSON-parsed response from the model.
 */
async function callOpenRouterAI(prompt: string, systemInstruction: string, modelName: string): Promise<any> {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${atob(OPENROUTER_API_KEY_B64)}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': SITE_URL,
                // FIX: URL-encode the site title to handle non-ASCII characters in HTTP headers.
                'X-Title': encodeURIComponent(SITE_NAME),
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' } // Instruct the model to output JSON
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('Received an empty response from the AI model.');
        }

        // The response content is a JSON string, so we need to parse it.
        return JSON.parse(content);

    } catch (error) {
        console.error('Error calling OpenRouter AI:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during the API call.';
        throw new Error(`AI analysis failed. Reason: ${errorMessage}`);
    }
}


export const getAnalysis = async (topic: string): Promise<AnalysisReport> => {
    const modelName = 'x-ai/grok-4-fast:free:online';
    const systemInstruction = `
        You are a top-tier financial analyst. Your task is to analyze the provided text using the "Four-Dimensional Integrated Analysis Method".
        Ensure your analysis is timely by incorporating the latest web information and market data.
        At the beginning of your analysis, you MUST provide a quantitative "investmentScore" from 1-100 and a list of 3-5 "keyTakeaways".
        You MUST respond strictly in the following JSON format. Do not add any extra explanations or text outside the JSON structure.
        All content must be in Simplified Chinese.
        The JSON schema is as follows:
        {
          "summary": "string (1-3 sentence summary)",
          "keyTakeaways": ["string (3-5 key bullet points)"],
          "investmentScore": {
            "score": "number (1-100)",
            "reason": "string (brief justification for the score)"
          },
          "analysis": {
            "macroPolicy": "string",
            "industryChain": {
              "upstream": [{"name": "string", "description": "string"}],
              "midstream": [{"name": "string", "description": "string"}],
              "downstream": [{"name": "string", "description": "string"}]
            },
            "companyFundamentals": "string",
            "marketSentiment": {
              "sentiment": "'Positive' | 'Neutral' | 'Negative'",
              "description": "string"
            }
          },
          "investmentStrategy": {
            "logic": "string",
            "suggestion": "string",
            "risks": "string"
          },
          "recommendedStocks": [{
            "name": "string",
            "ticker": "string",
            "market": "'A-Share' | 'Hong Kong' | 'US' | 'Other'",
            "reason": "string",
            "relevance": "'High' | 'Medium' | 'Low'"
          }]
        }
    `;
    
    const prompt = `
        Please analyze the following text using the "Four-Dimensional Integrated Analysis Method" and provide a structured investment strategy report.
        Text to analyze:
        ---
        ${topic}
        ---
    `;

    return callOpenRouterAI(prompt, systemInstruction, modelName);
};

export const getStockAnalysis = async (stockQuery: string): Promise<StockAnalysisReport> => {
    const modelName = 'x-ai/grok-4-fast:free:online';
    const systemInstruction = `
        You are a top-tier stock research analyst. Provide a comprehensive, in-depth, and objective analysis report for the given stock.
        It is crucial that you use the latest web search results, market data, and news for your analysis to ensure timeliness.
        At the beginning of your analysis, you MUST provide a quantitative "investmentScore" from 1-100 and a list of 3-5 "keyTakeaways".
        You MUST respond strictly in the following JSON format. Do not add any extra text. All content must be in Simplified Chinese.
        The JSON schema is as follows:
        {
          "companyProfile": {
            "name": "string",
            "ticker": "string",
            "exchange": "string",
            "sector": "string",
            "industry": "string",
            "summary": "string"
          },
          "keyTakeaways": ["string (3-5 key bullet points)"],
          "investmentScore": {
            "score": "number (1-100)",
            "reason": "string (brief justification for the score)"
          },
          "financialSummary": {
            "period": "string",
            "highlights": [{"metric": "string", "value": "string", "comment": "string"}]
          },
          "swotAnalysis": {
            "strengths": ["string"],
            "weaknesses": ["string"],
            "opportunities": ["string"],
            "threats": ["string"]
          },
          "investmentThesis": {
            "bull": "string",
            "bear": "string",
            "conclusion": "string"
          },
          "riskAnalysis": {
            "level": "'High' | 'Medium' | 'Low'",
            "description": "string",
            "factors": ["string"]
          },
          "corporateGovernance": {
            "summary": "string"
          },
          "esgRating": {
            "rating": "string",
            "summary": "string"
          }
        }
    `;
    
    const prompt = `
        Please provide a comprehensive analysis report for the following stock:
        ---
        ${stockQuery}
        ---
    `;

    return callOpenRouterAI(prompt, systemInstruction, modelName);
};