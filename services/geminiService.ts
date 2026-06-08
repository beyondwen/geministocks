
import type { AnalysisReport, StockAnalysisReport, PositionalWarfareReport, LeaderStockProfile, ResearchReportConsensus } from '../types';
import type { Locale } from '../hooks/useI18n';
import { jsonrepair } from 'jsonrepair';
import { captureError, addBreadcrumb } from './sentry';

// API Provider Configuration: 'ssgoo' or 'openrouter'
// SSGoo is currently experiencing 504 timeouts, using OpenRouter as fallback
const API_PROVIDER: 'ssgoo' | 'openrouter' = 'openrouter';

// OpenRouter API Configuration (fallback)
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

const getModelName = (): string => {
    if (API_PROVIDER === 'ssgoo') {
        return 'claude-sonnet-4-6';
    }
    // Free model on OpenRouter: Nvidia Nemotron 3 Ultra (550B)
    return 'nvidia/nemotron-3-ultra-550b-a55b:free';
};

const getModelDisplayName = (): string => {
    if (API_PROVIDER === 'ssgoo') {
        return 'Claude Sonnet 4-6 (SSGoo)';
    }
    return 'Nvidia Nemotron 3 Ultra (Free)';
};

/**
 * Extracts the likely JSON part from a string.
 * It looks for the first '{' or '['. 
 * If it finds a balanced closing brace, it returns that segment.
 * If the string ends prematurely (truncated), it returns from the start brace to the end of the string,
 * allowing jsonrepair to fix the unclosed structures.
 */
function extractJson(text: string): string {
    let startIndex = text.indexOf('{');
    let arrayStartIndex = text.indexOf('[');
    
    // Determine if we are looking for an object or an array
    // We prefer the one that appears first.
    let isObject = true;
    if (arrayStartIndex !== -1 && (startIndex === -1 || arrayStartIndex < startIndex)) {
        startIndex = arrayStartIndex;
        isObject = false;
    }

    if (startIndex === -1) return text; // No JSON start found

    const openChar = isObject ? '{' : '[';
    const closeChar = isObject ? '}' : ']';
    
    let balance = 0;
    let inString = false;
    let isEscaped = false;
    let endIndex = -1;

    for (let i = startIndex; i < text.length; i++) {
        const char = text[i];

        if (isEscaped) {
            isEscaped = false;
            continue;
        }

        if (char === '\\') {
            isEscaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === openChar) {
                balance++;
            } else if (char === closeChar) {
                balance--;
                if (balance === 0) {
                    endIndex = i;
                    break;
                }
            }
        }
    }

    if (endIndex !== -1) {
        return text.substring(startIndex, endIndex + 1);
    }
    
    // If we couldn't balance the braces (e.g. truncated output due to max_tokens), 
    // we return the substring from the start. `jsonrepair` will handle closing it.
    return text.substring(startIndex);
}

/**
 * A generic helper function to call the AI API (SSGoo proxy or OpenRouter).
 * @param prompt The user's prompt/request.
 * @param systemInstruction The system-level instruction for the AI model.
 * @param modelName The name of the model to use.
 * @param enableWebSearch Whether to enable real-time web search for latest data (OpenRouter only).
 * @returns The JSON-parsed response from the model.
 */
async function callOpenRouterAI(prompt: string, systemInstruction: string, modelName: string, enableWebSearch: boolean = false): Promise<any> {
    // Add breadcrumb for debugging
    addBreadcrumb('ai', `Calling ${API_PROVIDER} API`, { model: modelName, promptLength: prompt.length, webSearch: enableWebSearch });
    
    try {
        let response: Response;

        if (API_PROVIDER === 'ssgoo') {
            // Call SSGoo API via Vite proxy (dev) or Vercel serverless (prod)
            // In dev mode, Vite proxies /api/ssgoo-direct to SSGoo
            // In prod mode, the Vercel serverless function handles it
            const isDevMode = import.meta.env.DEV;
            
            if (isDevMode) {
                // Development: Use Vite proxy to call SSGoo directly
                response = await fetch('/api/ssgoo-direct', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [
                            { role: 'system', content: systemInstruction },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 8192
                    })
                });
            } else {
                // Production: Use Vercel serverless function
                response = await fetch('/api/ssgoo-proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt,
                        systemInstruction,
                        modelName,
                        maxTokens: 8192
                    })
                });
            }

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`SSGoo API request failed with status ${response.status}: ${errorBody}`);
            }

            const responseData = await response.json();
            
            // Handle both direct API response and proxy response formats
            let content: string;
            if (responseData.choices?.[0]?.message?.content) {
                // Direct SSGoo API response format
                content = responseData.choices[0].message.content;
            } else if (responseData.success && responseData.data) {
                // Proxy response format
                content = responseData.data;
            } else {
                throw new Error('Invalid response structure from SSGoo API');
            }

            if (!content) {
                throw new Error('Received an empty response from the AI model.');
            }

            // Parse the JSON response
            const rawJsonString = extractJson(content);
            try {
                const repairedJsonString = jsonrepair(rawJsonString);
                return JSON.parse(repairedJsonString);
            } catch {
                console.warn('JSON repair failed, attempting direct parse');
                return JSON.parse(rawJsonString);
            }
        }

        // OpenRouter API (fallback)
        const requestBody: any = {
            model: modelName,
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        };

        // Enable web search plugin for real-time market data and news
        if (enableWebSearch) {
            requestBody.plugins = [
                {
                    id: 'web',
                    max_results: 5
                }
            ];
        }

        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Super Digger'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('Received an empty response from the AI model.');
        }

        // 1. Extract the JSON part (remove markdown wrappers like ```json ... ```)
        const rawJsonString = extractJson(content);

        // 2. Use jsonrepair to fix truncated or malformed JSON
        // This handles unclosed braces, missing quotes, missing commas, etc.
        try {
            const repairedJsonString = jsonrepair(rawJsonString);
            return JSON.parse(repairedJsonString);
        } catch (e) {
            console.error("JSON Repair failed. Raw content:", content);
            // Re-throw a more informative error
            throw new Error(`Failed to parse AI response. The model output was likely too corrupted to repair.`);
        }

    } catch (error) {
        console.error('Error calling AI Service:', error);
        
        // Capture error in Sentry with context
        if (error instanceof Error) {
            captureError(error, {
                model: modelName,
                promptLength: prompt.length,
                systemInstructionLength: systemInstruction.length,
            });
        }
        
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during the API call.';
        throw new Error(`AI analysis failed. Reason: ${errorMessage}`);
    }
}

const getAnalysisSystemInstructions = (locale: Locale, modelDisplayName: string) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const commonInstructions = `You are a top-tier financial analyst with real-time market access. Today's date is ${today}. 

CRITICAL DATA REQUIREMENTS:
1. You MUST search for and incorporate the LATEST market data, news, and prices from today or the most recent trading day.
2. When mentioning stock prices, always include the date (e.g., "As of ${today}, AAPL trades at $XXX").
3. For news and catalysts, prioritize events from the last 7 days. Always include specific dates.
4. If real-time data is unavailable, clearly state "Data as of [date]" to indicate data freshness.
5. Never use outdated information without disclosure.

You MUST respond strictly in JSON format. Do not add any extra text.`;
    const languageInstruction = locale === 'zh' ? 'All content must be in Simplified Chinese.' : 'All content must be in English.';

    // Simplified Part 1: Remove macroPolicy, companyFundamentals. Keep industryChain and simplified sentiment.
    const part1Schema = `{
      "summary": "string (1-3 sentence summary)",
      "investmentScore": { "score": "number (1-100)", "reason": "string (brief justification for the score)" },
      "analysis": {
        "industryChain": { "upstream": [{"name": "string", "description": "string"}], "midstream": [{"name": "string", "description": "string"}], "downstream": [{"name": "string", "description": "string"}] },
        "marketSentiment": { "sentiment": "'Positive' | 'Neutral' | 'Negative'", "description": "string (Brief 1-sentence assessment of the current market mood)" }
      }
    }`;

    const part2Schema = `{
      "marketSizeAndOutlook": {
        "narrative": "string (Provide a forward-looking analysis of the market size and application prospects.)",
        "tamSamSom": { "TAM": "string", "SAM": "string", "SOM": "string", "sourceOrMethodology": "string" }
      },
      "competitiveLandscape": {
        "keyPlayers": [{ "name": "string", "marketShare": "string", "techAdvantage": "string", "revenueGrowth": "string", "grossMargin": "string", "stockPerformance": "string" }],
        "summary": "string (A brief summary of which company has the most comprehensive advantage)"
      },
      "catalystTracker": {
        "recentNews": [{ "date": "string (YYYY-MM-DD)", "description": "string", "impact": "'Positive' | 'Negative' | 'Neutral'" }],
        "upcomingCatalysts": [{ "date": "string (YYYY-MM-DD or Q3 2024)", "event": "string" }]
      },
      "policyAnalysis": { "keyBodies": ["string"], "currentPolicies": "string", "assessment": "'Headwind' | 'Tailwind' | 'Neutral'", "potentialChanges": "string" },
      "techTrajectory": { "coreTech": "string", "maturity": "'Emerging' | 'Maturing' | 'Mainstream'", "innovationTrends": ["string"], "moatAnalysis": "string" }
    }`;

    // Simplified Part 3: Remove Risk Matrix, Allocation Outlook, Association Analysis
    const part3Schema = `{
      "scenarioAnalysis": [
        { "scenario": "'Bull Case'", "description": "string", "probability": "number", "keyDrivers": ["string"] },
        { "scenario": "'Base Case'", "description": "string", "probability": "number", "keyDrivers": ["string"] },
        { "scenario": "'Bear Case'", "description": "string", "probability": "number", "keyDrivers": ["string"] }
      ],
      "investmentStrategy": {
        "logic": "string", "suggestion": "string",
        "timeHorizons": { "shortTerm": "string", "mediumTerm": "string", "longTerm": "string" }
      },
      "tieredSuggestions": {
        "coreHoldings": [{ "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'", "reason": "string", "relevance": "'High'" }],
        "strategicSatellites": [{ "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'", "reason": "string", "relevance": "'Medium'" }],
        "watchlist": [{ "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'", "reason": "string", "relevance": "'Low'" }]
      }
    }`;

    return {
        part1System: `${commonInstructions} You will generate the first part of the analysis: Core Analysis. ${languageInstruction} The JSON schema is: ${part1Schema}`,
        part2System: `${commonInstructions} You will generate the second part of the analysis: Deep Dives into market, competition, catalysts, policy, and tech. ${languageInstruction} The JSON schema is: ${part2Schema}`,
        part3System: `${commonInstructions} You will generate the final part of the analysis: Strategy & Suggestions. ${languageInstruction} You MUST populate the "modelUsed" field with this exact value: "${modelDisplayName}". The JSON schema is: ${part3Schema}`
    };
};

/**
 * Detects if a query requires real-time web search based on content analysis.
 * Market-sensitive queries (stocks, crypto, current events) need real-time data.
 * Historical or conceptual queries can use cached/model knowledge.
 */
const detectNeedsWebSearch = (topic: string): boolean => {
    const lowerTopic = topic.toLowerCase();
    
    // Patterns that indicate need for real-time data
    const realTimePatterns = [
        // Stock tickers and market terms
        /\b[A-Z]{1,5}\b/,  // Stock tickers like AAPL, NVDA
        /股票|stock|shares|equity/i,
        /市场|market|trading|交易/i,
        /价格|price|估值|valuation/i,
        /财报|earnings|quarterly|季报|年报/i,
        /ipo|上市|listing/i,
        // Crypto
        /比特币|bitcoin|btc|eth|crypto|加密货币/i,
        // Current events
        /最新|latest|recent|今天|today|本周|this week/i,
        /新闻|news|announcement|公告/i,
        // Companies and industries
        /公司|company|企业|corporation/i,
        /行业|industry|sector|板块/i,
    ];
    
    // Patterns that indicate historical/conceptual (no real-time needed)
    const historicalPatterns = [
        /历史|history|historical/i,
        /理论|theory|concept|概念/i,
        /经典|classic|传统/i,
        /\b(19|18)\d{2}\b/,  // Years like 1990, 1850
    ];
    
    // Check if any historical pattern matches
    const isHistorical = historicalPatterns.some(pattern => pattern.test(lowerTopic));
    if (isHistorical) return false;
    
    // Check if any real-time pattern matches
    const needsRealTime = realTimePatterns.some(pattern => pattern.test(topic));
    
    // Default to enabling web search for most financial queries
    return needsRealTime || lowerTopic.length > 10;
};

export const getAnalysis = async (topic: string, onProgress: (stepIndex: number) => void, locale: Locale): Promise<AnalysisReport> => {
    const modelName = getModelName();
    const modelDisplayName = getModelDisplayName();
    const { part1System, part2System, part3System } = getAnalysisSystemInstructions(locale, modelDisplayName);

    const prompt = `Please analyze the following text: --- ${topic} ---`;

    // Smart web search: only enable for market-sensitive queries
    const enableWebSearch = detectNeedsWebSearch(topic);

    onProgress(0); // "Running core analysis..."
    
    // OPTIMIZATION: Run all 3 AI calls in parallel instead of sequentially
    // This reduces total time from (T1 + T2 + T3) to max(T1, T2, T3)
    const [part1Result, part2Result, part3Result] = await Promise.all([
        callOpenRouterAI(prompt, part1System, modelName, enableWebSearch),
        callOpenRouterAI(prompt, part2System, modelName, enableWebSearch),
        callOpenRouterAI(prompt, part3System, modelName, enableWebSearch),
    ]);
    
    onProgress(3); // "Finalizing report..." (skip intermediate steps since parallel)

    // Combine results from all parts with data freshness metadata
    const now = new Date();
    const finalReport: AnalysisReport = {
        ...part1Result,
        ...part2Result,
        ...part3Result,
        modelUsed: modelDisplayName,
        dataFreshness: {
            generatedAt: now.toISOString(),
            dataAsOf: now.toISOString().split('T')[0],
            isRealTimeEnabled: enableWebSearch,
        },
    };
    
    return finalReport;
};

const getPolymarketAnalysisSystemInstruction = (locale: Locale): string => {
    const commonSchema = `
        {
          "polymarketData": {
            "question": "string (The specific question being predicted on the Polymarket page)",
            "yesOdds": "number (The current probability for 'Yes', between 0 and 1)",
            "noOdds": "number (The current probability for 'No', between 0 and 1)",
            "totalVolume": "string (The total trading volume, e.g., '$1.5M')"
          },
          "summary": "string (A 1-3 sentence summary of the market's prediction and its investment implications)",
          "investmentScore": {
            "score": "number (1-100, representing the clarity and actionability of the investment opportunity)",
            "reason": "string (Brief reason for the score)"
          },
          "analysis": {
            "industryChain": "string (Which industry sectors are most affected if 'Yes' wins vs. if 'No' wins)",
            "marketSentiment": {
              "sentiment": "'Positive' | 'Neutral' | 'Negative'",
              "description": "string (Describe the current market sentiment surrounding this prediction)"
            }
          },
          "marketSizeAndOutlook": "string (Analyze the potential market impact of both a 'Yes' and 'No' outcome)",
          "investmentStrategy": {
            "logic": "string (Explain the core logic for investing based on this prediction market. This MUST cover strategies for both 'Yes' and 'No' outcomes)",
            "suggestion": "string (Provide actionable suggestions for how to position a portfolio for either outcome)",
            "risks": "string (What are the risks associated with trading this prediction?)"
          },
          "tieredSuggestions": {
            "coreHoldings": [{ "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'", "reason": "string (A high-conviction asset to hold if you believe 'Yes' will happen)", "relevance": "'High'" }],
            "strategicSatellites": [{ "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'", "reason": "string (A high-conviction asset to hold if you believe 'No' will happen)", "relevance": "'Medium'" }],
            "watchlist": [{ "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'", "reason": "string (An asset to watch that is sensitive to the outcome)", "relevance": "'Low'" }]
          }
        }
    `;

    if (locale === 'zh') {
        return `
        You are a top-tier quantitative and qualitative analyst specializing in prediction markets. Your task is to analyze the provided Polymarket URL.
        First, you MUST extract the core data from the market: the question, the 'Yes'/'No' odds, and the total volume.
        Second, you MUST perform a comprehensive scenario analysis. Detail the market impact, investment logic, and provide specific, tiered investment suggestions for BOTH the 'Yes' outcome AND the 'No' outcome.
        You MUST respond strictly in the following JSON format. Do not add any extra explanations. All content must be in Simplified Chinese.
        The JSON schema is as follows:
        ${commonSchema}
    `;
    }
    return `
        You are a top-tier quantitative and qualitative analyst specializing in prediction markets. Your task is to analyze the provided Polymarket URL.
        First, you MUST extract the core data from the market: the question, the 'Yes'/'No' odds, and the total volume.
        Second, you MUST perform a comprehensive scenario analysis. Detail the market impact, investment logic, and provide specific, tiered investment suggestions for BOTH the 'Yes' outcome AND the 'No' outcome.
        You MUST respond strictly in the following JSON format. Do not add any extra explanations. All content must be in English.
        The JSON schema is as follows:
        ${commonSchema}
    `;
};


export const getPolymarketAnalysis = async (url: string, locale: Locale): Promise<AnalysisReport> => {
    const modelName = getModelName();
    const systemInstruction = getPolymarketAnalysisSystemInstruction(locale);
    
    const prompt = `
        Please analyze the following Polymarket URL and provide a structured investment strategy report based on its prediction market data and potential outcomes.
        URL to analyze:
        ---
        ${url}
        ---
    `;

    // Enable web search to get latest prediction market data
    return callOpenRouterAI(prompt, systemInstruction, modelName, true);
};

const getStockAnalysisSystemInstruction = (locale: Locale): string => {
    const schema = `{
          "companyProfile": { "name": "string", "ticker": "string", "exchange": "string", "sector": "string", "industry": "string" },
          "investmentScore": { "score": "number (1-100)", "reason": "string (A concise justification for the score)" },
          "marketSentimentAnalysis": {
            "sentiment": "'Positive' | 'Neutral' | 'Negative'",
            "description": "string (Analysis of current market sentiment)",
            "strategyImpact": "string (How this sentiment impacts investment strategy)"
          },
          "financialTrends": [
            { "year": "string (e.g., '2022A')", "revenue": "number (in millions of the reporting currency)", "netIncome": "number (in millions)" },
            { "year": "string (e.g., '2023A')", "revenue": "number", "netIncome": "number" },
            { "year": "string (e.g., '2024A')", "revenue": "number", "netIncome": "number" }
          ],
          "valuationAnalysis": {
            "judgment": "'undervalued' | 'fairly valued' | 'overvalued'",
            "methodology": "string (e.g., 'Based on a blend of P/E ratio comparison and a DCF model.')",
            "targetPriceRange": "string (e.g., '$180 - $200')",
            "reasoning": "string (Brief explanation for the valuation judgment)"
          },
          "peerComparison": [
            { "name": "string", "ticker": "string", "marketCap": "string", "peRatio": "string", "revenueGrowth": "string (YoY %)", "grossMargin": "string (%)" }
          ],
          "swotAnalysis": { "strengths": ["string"], "weaknesses": ["string"], "opportunities": ["string"], "threats": ["string"] },
          "investmentThesis": { "bull": "string", "bear": "string", "conclusion": "string" },
          "riskAnalysis": { "level": "'High' | 'Medium' | 'Low'", "description": "string", "factors": ["string"] },
          "managementAnalysis": {
            "keyExecutives": [ { "name": "string", "title": "string", "summary": "string (Brief bio)" } ],
            "insiderTradingSummary": "string (Summary of insider trading over the last 6 months)"
          },
          "technicalAnalysis": {
            "summary": "string (Brief summary of the technical outlook)",
            "rsi": { "value": "number (14-day RSI)", "interpretation": "'Overbought' | 'Oversold' | 'Neutral'" },
            "movingAverages": { "50-day": "'Above' | 'Below'", "200-day": "'Above' | 'Below'" }
          },
          "financialHealth": {
            "solvency": { "value": "string (Debt-to-Equity Ratio)", "industryAverage": "string" },
            "efficiency": { "value": "string (Return on Equity - ROE)", "industryAverage": "string" },
            "liquidity": { "value": "string (Current Ratio)", "industryAverage": "string" }
          },
          "earningsCallAnalysis": {
            "managementTone": "'Optimistic' | 'Cautious' | 'Pessimistic' | 'Neutral'",
            "keyHighlights": [ { "question": "string (Key analyst question)", "answer": "string (Summarized management answer)" } ],
            "futureGuidance": "string (Summary of future revenue/EPS guidance)"
          }
        }`;

    if (locale === 'zh') {
        return `
        你是一名顶级的股票研究分析师，具备强大的网络搜索和信息整合能力。请为给定的股票提供一份机构级的深度分析报告。
        你的分析必须基于最新的实时数据，包括财务报告、市场数据、新闻、技术指标以及最新的财报电话会议记录。
        
        你的任务是完成以下所有模块的分析：
        1.  **基本信息**: 公司简介、投资评分、市场情绪。
        2.  **财务与估值**: 过去3年的财务趋势、明确的估值判断（低估/合理/高估）及目标价、与2-3个核心竞品的量化对比。
        3.  **战略分析**: SWOT、���资论点（看涨/看跌）、风险分析。
        4.  **管理层与内部人动态**: 核心高管简介、过去6个月的内部人交易总结。
        5.  **技术分析快照**: 总结技术面貌，提供14日RSI值及解读、当前股价与50日和200日均线的关系。
        6.  **深度财务健康度**: 获取公司的偿债能力（资产负债率）、运营效率（ROE）和流动性（流动比率），并必须找到对应的行业平均值进行对比。
        7.  **财报电话会情报**: 搜索并分析最近一次财报电话会议的文字记录，总结管理层基调、关键问答环节的要点，以及未来的业绩指引。

        你必须严格按照以下 JSON 格式回应。不要添加任何额外的文本。所有内容必须是简体中文。
        JSON 结构如下:
        ${schema}
    `;
    }
    return `
        You are a top-tier stock research analyst with powerful web search and information synthesis capabilities. Provide an institutional-grade, in-depth analysis report for the given stock.
        Your analysis MUST be based on the latest real-time data, including financial reports, market data, news, technical indicators, and the most recent earnings call transcript.
        
        Your task is to complete analysis for ALL of the following modules:
        1.  **Basic Info**: Company profile, investment score, market sentiment.
        2.  **Financials & Valuation**: Financial trends for the last 3 years, a clear valuation judgment (undervalued/fairly valued/overvalued) with a target price, and a quantitative comparison against 2-3 key competitors.
        3.  **Strategic Analysis**: SWOT, investment thesis (bull/bear), risk analysis.
        4.  **Management & Insider Activity**: Key executive profiles, and a summary of insider trading over the last 6 months.
        5.  **Technical Analysis Snapshot**: Summarize the technical picture, providing the 14-day RSI value and interpretation, and the current price's position relative to the 50-day and 200-day moving averages.
        6.  **Deep-Dive Financial Health**: Find the company's solvency (Debt-to-Equity), efficiency (ROE), and liquidity (Current Ratio), and you MUST find their corresponding industry averages for comparison.
        7.  **Earnings Call Intelligence**: Search for and analyze the transcript of the latest earnings call to summarize the management's tone, key Q&A highlights, and future guidance.

        You MUST respond strictly in the following JSON format. Do not add any extra text. All content must be in English.
        The JSON schema is as follows:
        ${schema}
    `;
};


export const getStockAnalysis = async (
  stockQuery: string,
  onProgress: (stepIndex: number) => void,
  locale: Locale
  ): Promise<StockAnalysisReport> => {
    onProgress(0); // "Analyzing core fundamentals..."
    const modelName = getModelName();
    const systemInstruction = getStockAnalysisSystemInstruction(locale);
    
    const prompt = `
        Please provide a comprehensive analysis report for the following stock:
        ---
        ${stockQuery}
        ---
    `;

    // Enable web search to get latest stock prices, news, and market data
    const reportPart: Omit<StockAnalysisReport, 'researchReportConsensus'> = await callOpenRouterAI(prompt, systemInstruction, modelName, true);
    
    onProgress(1); // "Aggregating institutional research..."
    
    const researchData = await getResearchReportAnalysis(stockQuery, locale);
    
    onProgress(2); // "Synthesizing professional-grade report..."

    const combinedReport: StockAnalysisReport = {
        ...reportPart,
        researchReportConsensus: researchData,
    };

    return combinedReport;
};

const getResearchReportAnalysisSystemInstruction = (locale: Locale): string => {
    const commonSchema = `{
      "currentPrice": "number | null",
      "epsForecasts": [
        { "year": "string (e.g., '2025E')", "consensusEps": "number | null", "growthRate": "number | null (e.g., 15.5 for 15.5%)" }
      ],
      "targetPriceSummary": { "high": "number | null", "low": "number | null", "average": "number | null" },
      "recentReports": [
        { "title": "string", "institution": "string", "rating": "string", "publishDate": "string (YYYY-MM-DD)", "pdfUrl": "string" }
      ]
    }`;

    if (locale === 'zh') {
        return `
        你是一位专业的金融数据分析AI。你的任务是为给定的A股股票抓取并处理机构研究报告数据。你必须严格遵循以下步骤：
        1.  从用户查询中识别出6位数的股票代��。如果是公司名称，请找出其代码。
        2.  访问 URL \`https://data.eastmoney.com/report/{code}.html\` 来获取数据。
        3.  在页面HTML中，找到一个名为 \`var initdata = {...};\` 的JavaScript变量并解析这个JSON对象。
        4.  该对象中的 \`data\` 键包含一个研报列表。筛选这个列表，只保留最近3个月内发布的研报。如果最近3个月内少于2份，则使用最新的2份。
        5.  **EPS 预测**: 从筛选后���研报中，收集 \`predictThisYearEps\`、\`predictNextYearEps\` 和 \`predictNextTwoYearEps\` 的所有非空值。将它们分别映射到 "2025E"、"2026E" 和 "2027E" 这三年。计算这三个字段各自的平均值。
        6.  **EPS 增长率**: 计算明年的增长率公式为 \`(avg_next_year_eps - avg_this_year_eps) / Math.abs(avg_this_year_eps)\`。计算后年的增长率公式为 \`(avg_next_two_year_eps - avg_next_year_eps) / Math.abs(avg_next_year_eps)\`。结果表示为百分比（例如，15.5代表15.5%）。如果分母为零或不可用，增长率应为null。
        7.  **目标价**: 从筛选后的研报中，收集所有非空的 \`targetPrice\` 值。计算最高、最低和平均值。
        8.  **当前股价**: 从 \`https://qt.gtimg.cn/q={marketPrefix}{code}\` (例如 'sh600519') 获取当前股价。价格是返回的以波浪线分隔的字符串中的第4个字段（索引3）。如果无法获取，则使用最新研报中的 \`closePrice\`。
        9.  **近期研报**: 从筛选列表中选择最新的3份��报。为每份报告提取 \`title\`, \`orgSName\` (作为 institution), \`publishDate\`。尝试从 \`ratingName\` 字段或标题中找到评级（如 '买入', '增持'）。使用 \`infoCode\` 生成PDF URL，格式为: \`https://pdf.dfcfw.com/pdf/H3_{infoCode}_1.pdf\`。
        10. 你必须严格以JSON格式回应。不要添加任何额外文本。所有数字都应该是number类型。如果数据缺失，请使用null���空��组。所有内容必须是简体中文。
        
        JSON 结构: ${commonSchema}
    `;
    }
    return `
        You are an expert financial data analyst AI. Your task is to scrape and process institutional research report data for a given stock. You MUST follow these steps precisely:
        1.  From the user query, identify the stock ticker.
        2.  If it is a Chinese A-share stock, fetch data from the URL \`https://data.eastmoney.com/report/{code}.html\`. For other markets, use reliable financial data APIs.
        3.  Inside the Eastmoney page's HTML, find the JavaScript variable \`var initdata = {...};\` and parse this JSON object.
        4.  The \`data\` key inside this object contains a list of reports. Filter this list to include only reports published within the last 3 months. If there are fewer than 2 reports in the last 3 months, use the 2 most recent ones regardless of date.
        5.  **EPS Forecasts**: From the filtered reports, collect all non-null values for \`predictThisYearEps\`, \`predictNextYearEps\`, and \`predictNextTwoYearEps\`. Map them to the years "2025E", "2026E", and "2027E" respectively. Calculate the average for each of these three fields.
        6.  **EPS Growth**: Calculate the growth rate for the next year as \`(avg_next_year_eps - avg_this_year_eps) / Math.abs(avg_this_year_eps)\`. Calculate the growth for the year after as \`(avg_next_two_year_eps - avg_next_year_eps) / Math.abs(avg_next_year_eps)\`. Express growth as a percentage (e.g., 15.5 for 15.5%). If a denominator is zero or unavailable, the growth rate should be null.
        7.  **Target Price**: From the filtered reports, collect all non-null values for \`targetPrice\`. Calculate the highest, lowest, and average values.
        8.  **Current Price**: Fetch the current stock price from a reliable financial data source (e.g., Tencent Finance \`https://qt.gtimg.cn/q=\`, or Google Finance). If not available, use \`closePrice\` from the most recent report.
        9.  **Recent Reports**: Select the 3 most recent reports from the filtered list. For each, extract \`title\`, \`orgSName\` as institution, \`publishDate\`. Attempt to find a rating (like 'Buy', 'Overweight', 'Neutral') from the \`ratingName\` field or the title. For Eastmoney reports, generate the PDF URL using \`infoCode\` like so: \`https://pdf.dfcfw.com/pdf/H3_{infoCode}_1.pdf\`.
        10. You MUST respond strictly in the following JSON format. Do not add any extra text or explanations. All numbers should be actual numbers, not strings. Handle cases where data is missing gracefully by using null or empty arrays. All content must be in English.
        
        JSON Schema: ${commonSchema}
    `;
};

export const getResearchReportAnalysis = async (stockQuery: string, locale: Locale): Promise<ResearchReportConsensus> => {
    const modelName = getModelName();
    const systemInstruction = getResearchReportAnalysisSystemInstruction(locale);

    const prompt = `
        Please provide a research report consensus analysis for the following stock:
        ---
        ${stockQuery}
        ---
    `;

    try {
        // Enable web search to get latest research reports and analyst ratings
        const result = await callOpenRouterAI(prompt, systemInstruction, modelName, true);
        // Basic validation to ensure the AI returns a somewhat correct structure
        if (result && Array.isArray(result.epsForecasts) && result.targetPriceSummary && Array.isArray(result.recentReports)) {
            return result;
        }
        console.warn("AI returned a malformed ResearchReportConsensus object, returning a default.", result);
        // Return a default/empty object on failure to prevent crashes
        return { currentPrice: null, epsForecasts: [], targetPriceSummary: { high: null, low: null, average: null }, recentReports: [] };
    } catch (error) {
        console.error("Failed to get research report analysis:", error);
         // Return a default/empty object on failure to prevent crashes
        return { currentPrice: null, epsForecasts: [], targetPriceSummary: { high: null, low: null, average: null }, recentReports: [] };
    }
};

const getHotStocksSystemInstruction = (locale: Locale): string => {
    if (locale === 'zh') {
        return `
            You are a market analyst AI. Your task is to identify the 10 most discussed and trending stocks on the global market (including US, Hong Kong, and A-shares) within the last 24 hours based on current web data.
            You MUST respond strictly in the following JSON format. Do not add any extra explanations or text outside the JSON structure.
            All content must be in Simplified Chinese.
            The JSON schema is as follows:
            { "stocks": [ { "name": "string (公司名称)", "ticker": "string (股票代码)" } ] }
        `;
    }
    return `
        You are a market analyst AI. Your task is to identify the 10 most discussed and trending stocks on the global market (including US, Hong Kong, and A-shares) within the last 24 hours based on current web data.
        You MUST respond strictly in the following JSON format. Do not add any extra explanations or text outside the JSON structure.
        All content must be in English.
        The JSON schema is as follows:
        { "stocks": [ { "name": "string (company name)", "ticker": "string (stock ticker symbol)" } ] }
    `;
};

export const getHotStocksFromAI = async (locale: Locale): Promise<{name: string; ticker: string}[]> => {
    const modelName = getModelName();
    const systemInstruction = getHotStocksSystemInstruction(locale);
    const prompt = "Please provide the list of the 10 hottest stocks in the last 24 hours.";

    // Enable web search to get real-time trending stocks
    const response = await callOpenRouterAI(prompt, systemInstruction, modelName, true);
    if (response && Array.isArray(response.stocks)) {
      return response.stocks;
    }
    throw new Error('AI returned an invalid format for hot stocks.');
};

const getFindLeaderInstruction = (locale: Locale) => {
    const schema = `{ "name": "string", "ticker": "string", "sector": "string", "market": "string", "analysis": "string (A concise analysis of its market leadership)", "metrics": { "marketCap": "string", "peRatio": "string", "revenueGrowth": "string", "recentPerformance": "string" } }`;
    if (locale === 'zh') {
        return `你是一位顶级的金融分析师。你的任务是分析用户提供的查询。如果查询是一家具体的上市公司（如“英伟达”、“AAPL”），请识别其精确信息。如果查询是一个行业、赛道或概念（如“AI半导体”、“新能源汽车”），请找出该领域无可争议的市场领导者并提供其详细信息。使用网络搜索获取最新数据。如果某个指标不适用，请使用 "N/A"。必须严格以JSON格式回应。所有内容为简体中文。Schema: ${schema}`;
    }
    return `You are a top-tier financial analyst. Your task is to analyze the provided query. If the query is a specific, publicly traded company (e.g., "NVIDIA", "AAPL"), identify its precise details. If the query is an industry, sector, or concept (e.g., "AI semiconductors", "electric vehicles"), identify the undisputed market leader in that area and provide its details. Use web search for the latest data. If a metric is not applicable, use "N/A". You MUST respond strictly in JSON format. All content in English. Schema: ${schema}`;
};

const getFollowerAnalysisInstructions = (locale: Locale) => {
    const langConfig = {
        zh: {
            step2System: `You are a sector screener AI. Given a leading stock's profile, find 3 to 5 other publicly traded companies in the same specific sector that could be potential "follower" candidates. Focus on companies with a "lower position" (e.g., smaller market cap). For each, provide its name, ticker, and market. Respond strictly in JSON format. All content in Simplified Chinese. Schema: { "candidates": [{ "name": "string", "ticker": "string", "market": "string" }] }`,
            step3System: `You are a financial data retrieval AI. For the given list of companies, fetch their latest key financial metrics using web search. Provide market cap, P/E ratio, recent revenue growth (YoY), and recent stock performance (last 3 months). If a metric is not applicable, use "N/A". Respond strictly in JSON format. All content in Simplified Chinese. Schema: { "detailedCandidates": [{ "name": "string", "ticker": "string", "market": "string", "metrics": { "marketCap": "string", "peRatio": "string", "revenueGrowth": "string", "recentPerformance": "string" } }] }`,
            step4System: `You are a top-tier fund manager specializing in the "Positional Warfare Strategy". You have been given a leader's profile and potential follower candidates with metrics. Generate a comprehensive strategic report. Include a "strategistSummary". For EACH follower, provide "comparativeAnalysis", "investmentThesis", "potentialCatalysts", "risks", and a "positioningScore" (1-10 with reasoning). Respond strictly in JSON format. All content in Simplified Chinese. Schema: { "strategistSummary": "string", "followerAnalysis": [ { "ticker": "string", "comparativeAnalysis": "string", "investmentThesis": "string", "potentialCatalysts": ["string"], "risks": ["string"], "positioningScore": { "score": "number", "reasoning": "string" } } ] }`,
        },
        en: {
            step2System: `You are a sector screener AI. Given a leading stock's profile, find 3 to 5 other publicly traded companies in the same specific sector that could be potential "follower" candidates. Focus on companies with a "lower position" (e.g., smaller market cap). For each, provide its name, ticker, and market. Respond strictly in JSON format. All content in English. Schema: { "candidates": [{ "name": "string", "ticker": "string", "market": "string" }] }`,
            step3System: `You are a financial data retrieval AI. For the given list of companies, fetch their latest key financial metrics using web search. Provide market cap, P/E ratio, recent revenue growth (YoY), and recent stock performance (last 3 months). If a metric is not applicable, use "N/A". Respond strictly in JSON format. All content in English. Schema: { "detailedCandidates": [{ "name": "string", "ticker": "string", "market": "string", "metrics": { "marketCap": "string", "peRatio": "string", "revenueGrowth": "string", "recentPerformance": "string" } }] }`,
            step4System: `You are a top-tier fund manager specializing in the "Positional Warfare Strategy". You have been given a leader's profile and potential follower candidates with metrics. Generate a comprehensive strategic report. Include a "strategistSummary". For EACH follower, provide "comparativeAnalysis", "investmentThesis", "potentialCatalysts", "risks", and a "positioningScore" (1-10 with reasoning). Respond strictly in JSON format. All content in English. Schema: { "strategistSummary": "string", "followerAnalysis": [ { "ticker": "string", "comparativeAnalysis": "string", "investmentThesis": "string", "potentialCatalysts": ["string"], "risks": ["string"], "positioningScore": { "score": "number", "reasoning": "string" } } ] }`,
        }
    };
    return langConfig[locale];
}

export const findIndustryLeader = async (
  query: string,
  locale: Locale
  ): Promise<LeaderStockProfile> => {
    const modelName = getModelName();
    const systemInstruction = getFindLeaderInstruction(locale);
    // Enable web search to find current industry leaders with real-time data
    return await callOpenRouterAI(query, systemInstruction, modelName, true);
};

export const getPositionalWarfareFollowerAnalysis = async (
  leaderProfile: LeaderStockProfile,
  onProgress: (stepIndex: number) => void,
  locale: Locale
  ): Promise<PositionalWarfareReport> => {
    const modelName = getModelName();
    const { step2System, step3System, step4System } = getFollowerAnalysisInstructions(locale);

    // Enable web search for all steps to get real-time market data
    const enableWebSearch = true;

    onProgress(1); // Screening for followers
    const step2Prompt = locale === 'zh' ? `龙头股票资料: ${JSON.stringify(leaderProfile)}` : `Leader Stock Profile: ${JSON.stringify(leaderProfile)}`;
    const screeningResult = await callOpenRouterAI(step2Prompt, step2System, modelName, enableWebSearch);
    const candidates = screeningResult.candidates || [];
    if (candidates.length === 0) throw new Error(locale === 'zh' ? "未能找到合适的潜力补涨股。" : "Could not find suitable follower candidates.");

    onProgress(2); // Analyzing candidate financials
    const step3Prompt = locale === 'zh' ? `公司列表: ${JSON.stringify(candidates)}` : `Companies List: ${JSON.stringify(candidates)}`;
    const metricsResult = await callOpenRouterAI(step3Prompt, step3System, modelName, enableWebSearch);
    const detailedCandidates = metricsResult.detailedCandidates || [];

    onProgress(3); // Synthesizing final strategy
    const step4Prompt = locale === 'zh' ? `龙头股票: ${JSON.stringify(leaderProfile)}\n\n潜力补涨股及指标: ${JSON.stringify(detailedCandidates)}` : `Leader Stock: ${JSON.stringify(leaderProfile)}\n\nFollower Candidates with Metrics: ${JSON.stringify(detailedCandidates)}`;
    const finalAnalysis = await callOpenRouterAI(step4Prompt, step4System, modelName, enableWebSearch);
    
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
        followerCandidates: finalFollowers as any[],
    };

    return finalReport;
};
