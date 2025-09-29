import type { AnalysisReport, StockAnalysisReport, PositionalWarfareReport } from '../types';

// --- OpenRouter Configuration ---
const API_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
// The API key is Base64 encoded for basic obfuscation in the client-side code.
const OPENROUTER_API_KEY_B64 = 'c2stb3ItdjEtYzJmMjVlMjFjZTQ5ODc5MGYwYTcwMmM4OTI3MTZmYjNlZDkzYzA1YWFjMGQwODAxZmZiMDEzOWFmYmNlNDZmNw==';
const SITE_URL = 'https://mastersgo.cc';
const SITE_NAME = '超级挖掘机';

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
        If the topic is related to blockchain, Web3, or cryptocurrencies, you MUST also recommend relevant cryptocurrencies.
        If the topic is related to commodities, raw materials, or macroeconomic cycles, you MUST also recommend relevant commodity futures (e.g., Gold 'GC=F', Crude Oil 'CL=F').
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
          "marketSizeAndOutlook": "string (Provide a forward-looking analysis of the market size and application prospects. Include quantitative data if possible, e.g., market value, CAGR, and describe future growth drivers and potential new application scenarios.)",
          "investmentStrategy": {
            "logic": "string",
            "suggestion": "string",
            "risks": "string"
          },
          "allocationCadenceAndOutlook": "string (Provide guidance on investment timing, position building pace, and long-term outlook. e.g., 'Suggest building a position gradually over 1-2 months, targeting a 12-month hold. Key catalysts to watch are Q3 earnings and upcoming industry policy.')",
          "tieredSuggestions": {
            "coreHoldings": [{
              "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'",
              "reason": "string (Reason for being a high-conviction core holding)", "relevance": "'High'"
            }],
            "strategicSatellites": [{
              "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'",
              "reason": "string (Reason for being a satellite holding with higher growth potential or representing a different sub-sector)", "relevance": "'Medium'"
            }],
            "watchlist": [{
              "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'",
              "reason": "string (Reason for being on the watchlist, e.g., waiting for a better entry point or more information)", "relevance": "'Low'"
            }]
          }
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

export const getHotStocksFromAI = async (): Promise<{name: string; ticker: string}[]> => {
    const modelName = 'x-ai/grok-4-fast:free:online';
    const systemInstruction = `
        You are a market analyst AI. Your task is to identify the 10 most discussed and trending stocks on the global market (including US, Hong Kong, and A-shares) within the last 24 hours based on current web data.
        You MUST respond strictly in the following JSON format. Do not add any extra explanations or text outside the JSON structure.
        All content must be in Simplified Chinese.
        The JSON schema is as follows:
        {
          "stocks": [
            {
              "name": "string (company name)",
              "ticker": "string (stock ticker symbol)"
            }
          ]
        }
    `;
    const prompt = "Please provide the list of the 10 hottest stocks in the last 24 hours.";

    const response = await callOpenRouterAI(prompt, systemInstruction, modelName);
    // The AI is instructed to return an object with a "stocks" key. We extract the array.
    if (response && Array.isArray(response.stocks)) {
      return response.stocks;
    }
    // Fallback in case the AI fails to follow the schema perfectly.
    throw new Error('AI returned an invalid format for hot stocks.');
};

// --- New Service for Positional Warfare Analysis ---
export const getPositionalWarfareAnalysis = async (
    leaderStockQuery: string,
    onProgress: (message: string) => void
): Promise<PositionalWarfareReport> => {
    const modelName = 'x-ai/grok-4-fast:free:online';

    // Step 1: Identify Leader Stock
    onProgress("正在锁定龙头标的... 🎯");
    const step1System = `
        You are an intelligence scout. Your only task is to identify the precise details of the provided stock query.
        Use web search to find the official company name, ticker symbol, primary sector, and market.
        Respond strictly in the following JSON format. All content in Simplified Chinese.
        { "name": "string", "ticker": "string", "sector": "string", "market": "string" }
    `;
    const leaderProfile = await callOpenRouterAI(leaderStockQuery, step1System, modelName);

    // Step 2: Analyze Leader Stock
    onProgress("正在深度剖析龙头股... 📈");
    const step2System = `
        You are a lead stock analyst. Given the stock's profile, analyze its current market position.
        Focus on: 1. Why it is considered the leader in its sector (technical edge, market share). 2. Its current valuation and recent performance (e.g., high P/E, recent significant gains).
        Respond strictly in the following JSON format. All content in Simplified Chinese.
        { "analysis": "string (A concise but in-depth analysis of the leader's position)" }
    `;
    const leaderAnalysis = await callOpenRouterAI(JSON.stringify(leaderProfile), step2System, modelName);

    // Step 3: Screen for Candidates
    onProgress("正在筛选同板块潜力股... 🔍");
    const step3System = `
        You are a sector screener. Given a sector, find 5-10 other publicly traded companies in the same specific sector.
        Focus on finding companies that have a "lower position" than the leader (e.g., smaller market cap, lower valuation multiples, or have not experienced the same recent rally).
        For each company, provide its name, ticker, and market.
        Respond strictly in the following JSON format. All content in Simplified Chinese.
        { "candidates": [{ "name": "string", "ticker": "string", "market": "string" }] }
    `;
    const screeningResult = await callOpenRouterAI(`Sector: ${leaderProfile.sector}`, step3System, modelName);
    const candidates = screeningResult.candidates || [];

    // Step 4: Final Strategic Analysis
    onProgress("首席策略师正在制定卡位方案... ⚔️");
    const step4System = `
        You are a top-tier fund manager specializing in the "Positional Warfare Strategy".
        You have been given a profile of the leading stock and a list of potential follower candidates.
        Your task is to select the 1-3 most promising "follower" or "number two" stocks from the list.
        For each stock you select, you must provide a detailed comparative report.
        This report must justify WHY it has the potential to become a follower, focusing on:
        1.  **Comparative Analysis**: How does it compare to the leader in terms of business, technology, and market position?
        2.  **Investment Thesis**: What is the core logic for it to "catch up"? (e.g., valuation gap, upcoming catalyst, similar underlying business but overlooked).
        3.  **Risks**: What are the key risks associated with this specific pick?
        Respond strictly in the following JSON format. All content in Simplified Chinese.
        {
          "leaderStock": {
            "name": "${leaderProfile.name}",
            "ticker": "${leaderProfile.ticker}",
            "sector": "${leaderProfile.sector}",
            "market": "${leaderProfile.market}",
            "analysis": "${leaderAnalysis.analysis}"
          },
          "followerCandidates": [{
            "name": "string",
            "ticker": "string",
            "market": "string",
            "comparativeAnalysis": "string",
            "investmentThesis": "string",
            "risks": "string"
          }]
        }
    `;
    const finalPrompt = `Leader Stock Analysis: ${leaderAnalysis.analysis}\n\nCandidate List:\n${JSON.stringify(candidates)}`;

    return callOpenRouterAI(finalPrompt, step4System, modelName);
};
