import type { AnalysisReport, StockAnalysisReport, PositionalWarfareReport, LeaderStockProfile } from '../types';

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

        // FIX: Clean the response to handle models that wrap JSON in Markdown or other text.
        // This is a robust way to extract a JSON object from a string that might have extra text.
        let jsonString = content;
        const firstBraceIndex = jsonString.indexOf('{');
        const lastBraceIndex = jsonString.lastIndexOf('}');

        if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
            jsonString = jsonString.substring(firstBraceIndex, lastBraceIndex + 1);
        }

        // The response content is a JSON string, so we need to parse it.
        return JSON.parse(jsonString);

    } catch (error) {
        console.error('Error calling OpenRouter AI:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during the API call.';
        throw new Error(`AI analysis failed. Reason: ${errorMessage}`);
    }
}


export const getAnalysis = async (topic: string): Promise<AnalysisReport> => {
    const modelName = 'deepseek/deepseek-v3.2-exp:online';
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
    const modelName = 'deepseek/deepseek-v3.2-exp:online';
    const systemInstruction = `
        You are a top-tier stock research analyst. Provide a comprehensive, in-depth, and objective analysis report for the given stock.
        It is crucial that you use the latest web search results, market data, and news for your analysis to ensure timeliness.
        Specifically, you MUST search for institutional research reports on 'data.eastmoney.com/report' from the last 3 months to create the 'researchAnalysis' section.
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
          "financialTrends": [
            { "year": "string (e.g., '2023')", "revenue": "number (in millions of the reporting currency, e.g., 150000)", "netIncome": "number (in millions of the reporting currency, e.g., 30000)" }
          ],
          "valuationAnalysis": {
            "judgment": "'undervalued' | 'fairly valued' | 'overvalued'",
            "methodology": "string (Briefly explain the method, e.g., 'Compared P/E ratio with industry peers and historical average.')",
            "targetPriceRange": "string (e.g., '$180 - $200')",
            "reasoning": "string (Provide a concise justification for the valuation judgment and target price.)"
          },
          "peerComparison": [
            {
              "name": "string (Competitor's name)",
              "ticker": "string (Competitor's ticker)",
              "marketCap": "string (e.g., '2.5T USD')",
              "peRatio": "string (e.g., '28.5x')",
              "revenueGrowth": "string (e.g., '15.2% YoY')",
              "grossMargin": "string (e.g., '45.1%')"
            }
          ],
          "researchAnalysis": {
            "consensusRating": "string (e.g., '买入', '增持', '中性', based on reports from the last 3 months)",
            "targetPriceSummary": "string (e.g., '综合目标价 ¥180 - ¥200', based on reports from the last 3 months)",
            "recentReports": [
              {
                "title": "string (Title of the research report)",
                "source": "string (Name of the institution, e.g., '中信证券')",
                "publishDate": "string (e.g., 'YYYY-MM-DD')",
                "rating": "string (e.g., '买入', '增持')",
                "summary": "string (A brief summary of the report's key points)"
              }
            ]
          },
          "recentNews": [
            {
              "title": "string (Title of the recent news/event)",
              "summary": "string (A brief summary of the news)",
              "impact": "'Positive' | 'Neutral' | 'Negative'"
            }
          ],
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
        For the "financialTrends" section, please provide data for the last 3 completed fiscal years. For "peerComparison", identify 2-3 main competitors. For "recentNews", summarize 1-3 most important recent news items. For "researchAnalysis", provide a consensus based on the last 3 months of reports and summarize the 3 most recent reports.
    `;

    return callOpenRouterAI(prompt, systemInstruction, modelName);
};

export const getHotStocksFromAI = async (): Promise<{name: string; ticker: string}[]> => {
    const modelName = 'deepseek/deepseek-v3.2-exp:online';
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

// --- Enhanced Service for Positional Warfare Analysis ---
export const getPositionalWarfareAnalysis = async (
    leaderStockQuery: string,
    onProgress: (message: string) => void
): Promise<PositionalWarfareReport> => {
    const modelName = 'deepseek/deepseek-v3.2-exp:online';

    // Step 1: Deep Profile on the Leader Stock
    onProgress("正在锁定并深度剖析龙头... 🎯");
    const step1System = `
        You are a top-tier financial analyst. Your task is to identify the precise details of the provided stock query and provide a brief analysis of its market leadership.
        Use web search for the latest data. If a metric is not applicable (e.g., P/E for a non-profitable company), use "N/A".
        Respond strictly in the following JSON format. All content in Simplified Chinese.
        {
          "name": "string",
          "ticker": "string",
          "sector": "string",
          "market": "string",
          "analysis": "string (A concise analysis of why this stock is considered a leader in its sector, its current valuation, and recent performance trends.)",
          "metrics": {
            "marketCap": "string (e.g., '1.2T USD')",
            "peRatio": "string (e.g., '25.x' or 'N/A')",
            "revenueGrowth": "string (e.g., '15% YoY')",
            "recentPerformance": "string (e.g., '+30% in last 3 months')"
          }
        }
    `;
    const leaderProfile: LeaderStockProfile = await callOpenRouterAI(leaderStockQuery, step1System, modelName);

    // Step 2: Screen for Follower Candidates
    onProgress("正在海选同板块潜力股... 🔍");
    const step2System = `
        You are a sector screener AI. Given a leading stock's profile, find 3 to 5 other publicly traded companies in the same specific sector that could be potential "follower" candidates.
        Focus on companies that have a "lower position" (e.g., significantly smaller market cap) but operate in a similar business area.
        For each company, provide its name, ticker, and market.
        Respond strictly in the following JSON format. All content in Simplified Chinese.
        { "candidates": [{ "name": "string", "ticker": "string", "market": "string" }] }
    `;
    const screeningResult = await callOpenRouterAI(`Leader Stock Profile: ${JSON.stringify(leaderProfile)}`, step2System, modelName);
    const candidates = screeningResult.candidates || [];
    if (candidates.length === 0) throw new Error("未能找到合适的潜力补涨股。");

    // Step 3: Get Financial Metrics for all Candidates in a Batch
    onProgress("正在分析候选股财务指标... 📊");
    const step3System = `
        You are a financial data retrieval AI. For the given list of companies, fetch their latest key financial metrics using web search.
        Provide the market cap, P/E ratio, recent revenue growth (YoY), and recent stock performance (last 3 months).
        If a metric is not applicable (e.g., P/E for a non-profitable company), use "N/A".
        Respond strictly in the following JSON format. All content in Simplified Chinese.
        {
          "detailedCandidates": [
            {
              "name": "string",
              "ticker": "string",
              "market": "string",
              "metrics": {
                "marketCap": "string (e.g., '1.2T USD')",
                "peRatio": "string (e.g., '25.x' or 'N/A')",
                "revenueGrowth": "string (e.g., '15% YoY')",
                "recentPerformance": "string (e.g., '+30% in last 3 months')"
              }
            }
          ]
        }
    `;
    const metricsResult = await callOpenRouterAI(`Companies List: ${JSON.stringify(candidates)}`, step3System, modelName);
    const detailedCandidates = metricsResult.detailedCandidates || [];

    // Step 4: Final Strategic Synthesis
    onProgress("正在生成核心观点总结... ⚔️");
    const step4System = `
        You are a top-tier fund manager specializing in the "Positional Warfare Strategy".
        You have been given a profile of the leading stock and a list of potential follower candidates with their financial metrics.
        Your task is to generate a comprehensive strategic report.
        The report must include:
        1.  A concise "strategistSummary" (2-3 sentences) at the very top, highlighting the best opportunity and the core logic.
        2.  For EACH of the follower candidates, provide a detailed analysis including:
            - "comparativeAnalysis": How does it compare to the leader in terms of business model, technology, and market position? Is it a direct competitor or a niche player?
            - "investmentThesis": What is the core logic for it to "catch up" or "fill the gap"? (e.g., valuation gap, upcoming catalyst, similar underlying business but overlooked).
            - "potentialCatalysts": A list of 2-3 specific, potential future events that could drive the stock price up.
            - "risks": A list of 2-3 key risks associated with this specific pick.
            - "positioningScore": An object containing a "score" (from 1 to 10, where 10 is the highest potential) and a "reasoning" for that score.

        You MUST respond strictly in the following JSON format. All content in Simplified Chinese. The candidate profiles are provided for context; you only need to generate the "strategistSummary" and the analysis fields for each follower.

        JSON Schema for your response:
        {
          "strategistSummary": "string",
          "followerAnalysis": [
            {
              "ticker": "string (Must match one of the candidate tickers)",
              "comparativeAnalysis": "string",
              "investmentThesis": "string",
              "potentialCatalysts": ["string"],
              "risks": ["string"],
              "positioningScore": {
                "score": "number (1-10)",
                "reasoning": "string"
              }
            }
          ]
        }
    `;
    const finalPrompt = `Leader Stock: ${JSON.stringify(leaderProfile)}\n\nFollower Candidates with Metrics: ${JSON.stringify(detailedCandidates)}`;
    const finalAnalysis = await callOpenRouterAI(finalPrompt, step4System, modelName);
    
    // Merge the final analysis with the detailed candidate data
    const finalFollowers = detailedCandidates.map((candidate: any) => {
        const analysisData = finalAnalysis.followerAnalysis.find((a: any) => a.ticker === candidate.ticker);
        if (!analysisData) return null;
        return {
            ...candidate,
            ...analysisData,
        };
    }).filter(Boolean); // Filter out any candidates for whom analysis wasn't returned

    const finalReport: PositionalWarfareReport = {
        strategistSummary: finalAnalysis.strategistSummary,
        leaderStock: leaderProfile,
        followerCandidates: finalFollowers as any[], // Casting as we've built the object to match the type
    };

    return finalReport;
};