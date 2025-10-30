import type { AnalysisReport, StockAnalysisReport, PositionalWarfareReport, LeaderStockProfile, ResearchReportConsensus } from '../types';
import type { Locale } from '../hooks/useI18n';

export type AnalysisModel = 'deepseek' | 'gemini' | 'claude' | 'minimax';

// --- OpenRouter Configuration ---
const API_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
// The API key is Base64 encoded for basic obfuscation in the client-side code.
const OPENROUTER_API_KEY_B64 = 'c2stb3ItdjEtM2QyNWM4NzRjOWM4ODJhZjVmYTM3ZDA0MmMxMmY0ZjEyZGYxYzIyZWNjMzE5ZTUyMzdkM2E4ZjdmYjE2NTgxNg==';
const SITE_URL = 'https://mastersgo.cc';
const SITE_NAME = '超级挖掘机';

const getModelName = (model: AnalysisModel): string => {
    if (model === 'gemini') {
        return 'google/gemini-2.5-flash';
    }
    if (model === 'claude') {
        return 'anthropic/claude-haiku-4.5';
    }
    if (model === 'deepseek') {
        return 'deepseek/deepseek-v3.2-exp';
    }
    if (model === 'minimax') {
        return 'minimax/minimax-m2:free';
    }
    // Fallback to the new default model if type is somehow invalid
    return 'minimax/minimax-m2:free';
};

/**
 * A generic helper function to call the OpenRouter API.
 * @param prompt The user's prompt/request.
 * @param systemInstruction The system-level instruction for the AI model.
 * @param modelName The name of the model to use.
 * @returns The JSON-parsed response from the model.
 */
async function callOpenRouterAI(prompt: string, systemInstruction: string, modelName: string): Promise<any> {
    try {
        // Construct the base request body.
        const requestBody: {
            model: string;
            messages: { role: string; content: string }[];
            response_format?: { type: string };
        } = {
            model: modelName,
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
            ],
        };

        // Handle model-specific parameters for JSON output.
        // Some models like Grok or Minimax have issues with `response_format`.
        // By NOT setting it, we rely on their instruction-following capability from the system prompt.
        if (!modelName.startsWith('x-ai/grok') && !modelName.startsWith('minimax/')) {
            // For other models like Gemini, use the standard `response_format` for reliable JSON mode.
            requestBody.response_format = { type: "json_object" };
        }
        
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${atob(OPENROUTER_API_KEY_B64)}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': SITE_URL,
                // FIX: URL-encode the site title to handle non-ASCII characters in HTTP headers.
                'X-Title': encodeURIComponent(SITE_NAME),
            },
            body: JSON.stringify(requestBody),
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
        let jsonString = content;
        const firstBraceIndex = jsonString.indexOf('{');
        const lastBraceIndex = jsonString.lastIndexOf('}');

        if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
            jsonString = jsonString.substring(firstBraceIndex, lastBraceIndex + 1);
        }

        // FIX: The Gemini model can sometimes generate malformed JSON arrays by omitting commas
        // between objects. This attempts to parse the JSON, and if it fails with a specific
        // syntax error, it tries to fix the common comma issue and re-parses.
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            if (e instanceof SyntaxError && (e.message.includes("Unexpected token") || e.message.includes("expected ',' or ']"))) {
                console.warn("Initial JSON parsing failed with a suspected missing comma. Attempting to auto-correct.", e);
                try {
                    // This regex finds `}` followed by `{` (with optional whitespace) and inserts a comma.
                    const correctedJson = jsonString.replace(/}(?=\s*\{)/g, '},');
                    return JSON.parse(correctedJson);
                } catch (correctionError) {
                    console.error("Auto-correction of JSON failed. The error is likely more complex.", correctionError);
                    // Re-throw the original error as it is more indicative of the initial problem.
                    throw e;
                }
            }
            // If the error is not the one we're trying to fix, re-throw it immediately.
            throw e;
        }

    } catch (error) {
        console.error('Error calling OpenRouter AI:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during the API call.';
        throw new Error(`AI analysis failed. Reason: ${errorMessage}`);
    }
}

const getAnalysisSystemInstruction = (locale: Locale): string => {
    if (locale === 'zh') {
        return `
        You are a top-tier financial analyst. Your task is to analyze the provided text using the "Four-Dimensional Integrated Analysis Method".
        Ensure your analysis is timely by incorporating the latest web information and market data.
        If the topic is related to blockchain, Web3, or cryptocurrencies, you MUST also recommend relevant cryptocurrencies.
        If the topic is related to commodities, raw materials, or macroeconomic cycles, you MUST also recommend relevant commodity futures (e.g., Gold 'GC=F', Crude Oil 'CL=F').
        At the beginning of your analysis, you MUST provide a quantitative "investmentScore" from 1-100 and a list of 3-5 "keyTakeaways".
        You MUST respond strictly in the following JSON format. Do not add any extra explanations or text outside the JSON structure.
        All content must be in Simplified Chinese.
        The JSON schema is as follows:
        {
          "summary": "string (1-3句话总结)",
          "keyTakeaways": ["string (3-5个核心要点)"],
          "investmentScore": {
            "score": "number (1-100)",
            "reason": "string (对分数的简要理由)"
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
          "marketSizeAndOutlook": "string (对市场规模和应用前景进行前瞻性分析。)",
          "investmentStrategy": {
            "logic": "string",
            "suggestion": "string",
            "risks": "string"
          },
          "allocationCadenceAndOutlook": "string (提供关于投资时机、建仓节奏和长期展望的指导。)",
          "tieredSuggestions": {
            "coreHoldings": [{
              "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'",
              "reason": "string (作为核心持仓的理由)", "relevance": "'High'"
            }],
            "strategicSatellites": [{
              "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'",
              "reason": "string (作为卫星持仓的理由)", "relevance": "'Medium'"
            }],
            "watchlist": [{
              "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'",
              "reason": "string (列入观察名单的理由)", "relevance": "'Low'"
            }]
          },
          "associationAnalysis": {
            "relatedStocks": [{
              "name": "string (例如 '英伟达')",
              "ticker": "string (例如 'NVDA')",
              "reason": "string (简明扼要的关联原因)"
            }],
            "relatedTopics": [{
              "name": "string (例如 'AI芯片制造')",
              "reason": "string (简明扼要的关联原因)"
            }]
          }
        }
    `;
    }
    return `
        You are a top-tier financial analyst. Your task is to analyze the provided text using the "Four-Dimensional Integrated Analysis Method".
        Ensure your analysis is timely by incorporating the latest web information and market data.
        If the topic is related to blockchain, Web3, or cryptocurrencies, you MUST also recommend relevant cryptocurrencies.
        If the topic is related to commodities, raw materials, or macroeconomic cycles, you MUST also recommend relevant commodity futures (e.g., Gold 'GC=F', Crude Oil 'CL=F').
        At the beginning of your analysis, you MUST provide a quantitative "investmentScore" from 1-100 and a list of 3-5 "keyTakeaways".
        You MUST respond strictly in the following JSON format. Do not add any extra explanations or text outside the JSON structure.
        All content must be in English.
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
          "marketSizeAndOutlook": "string (Provide a forward-looking analysis of the market size and application prospects.)",
          "investmentStrategy": {
            "logic": "string",
            "suggestion": "string",
            "risks": "string"
          },
          "allocationCadenceAndOutlook": "string (Provide guidance on investment timing, position building pace, and long-term outlook.)",
          "tieredSuggestions": {
            "coreHoldings": [{
              "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'",
              "reason": "string (Reason for being a high-conviction core holding)", "relevance": "'High'"
            }],
            "strategicSatellites": [{
              "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'",
              "reason": "string (Reason for being a satellite holding)", "relevance": "'Medium'"
            }],
            "watchlist": [{
              "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'",
              "reason": "string (Reason for being on the watchlist)", "relevance": "'Low'"
            }]
          },
          "associationAnalysis": {
            "relatedStocks": [{
              "name": "string (e.g., 'NVIDIA Corp')",
              "ticker": "string (The stock ticker, e.g., 'NVDA')",
              "reason": "string (Concise reason for relevance)"
            }],
            "relatedTopics": [{
              "name": "string (e.g., 'AI Chip Manufacturing')",
              "reason": "string (Concise reason for relevance)"
            }]
          }
        }
    `;
};


export const getAnalysis = async (topic: string, model: AnalysisModel, locale: Locale): Promise<AnalysisReport> => {
    const modelName = getModelName(model);
    const systemInstruction = getAnalysisSystemInstruction(locale);
    
    const prompt = `
        Please analyze the following text using the "Four-Dimensional Integrated Analysis Method" and provide a structured investment strategy report.
        Text to analyze:
        ---
        ${topic}
        ---
    `;

    return callOpenRouterAI(prompt, systemInstruction, modelName);
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
          "keyTakeaways": ["string (3-5 key takeaways covering both 'Yes' and 'No' scenarios)"],
          "investmentScore": {
            "score": "number (1-100, representing the clarity and actionability of the investment opportunity)",
            "reason": "string (Brief reason for the score)"
          },
          "analysis": {
            "macroPolicy": "string (How macro factors or policy could influence the outcome of this prediction)",
            "industryChain": "string (Which industry sectors are most affected if 'Yes' wins vs. if 'No' wins)",
            "companyFundamentals": "string (Analyze which specific companies' fundamentals would be most impacted by either outcome)",
            "marketSentiment": {
              "sentiment": "'Positive' | 'Neutral' | 'Negative'",
              "description": "string (Describe the current market sentiment surrounding this prediction and potential catalysts)"
            }
          },
          "marketSizeAndOutlook": "string (Analyze the potential market impact of both a 'Yes' and 'No' outcome)",
          "investmentStrategy": {
            "logic": "string (Explain the core logic for investing based on this prediction market. This MUST cover strategies for both 'Yes' and 'No' outcomes)",
            "suggestion": "string (Provide actionable suggestions for how to position a portfolio for either outcome)",
            "risks": "string (What are the risks associated with trading this prediction?)"
          },
          "allocationCadenceAndOutlook": "string (Guidance on timing and long-term outlook depending on the outcome)",
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


export const getPolymarketAnalysis = async (url: string, model: AnalysisModel, locale: Locale): Promise<AnalysisReport> => {
    const modelName = getModelName(model);
    const systemInstruction = getPolymarketAnalysisSystemInstruction(locale);
    
    const prompt = `
        Please analyze the following Polymarket URL and provide a structured investment strategy report based on its prediction market data and potential outcomes.
        URL to analyze:
        ---
        ${url}
        ---
    `;

    return callOpenRouterAI(prompt, systemInstruction, modelName);
};

const getStockAnalysisSystemInstruction = (locale: Locale): string => {
    if (locale === 'zh') {
        return `
        You are a top-tier stock research analyst. Provide a comprehensive, in-depth, and objective analysis report for the given stock.
        It is crucial that you use the latest web search results, market data, and news for your analysis to ensure timeliness.
        Specifically, you MUST search for institutional research reports on 'data.eastmoney.com/report' from the last 3 months to create the 'researchAnalysis' section.
        At the beginning of your analysis, you MUST provide a quantitative "investmentScore" from 1-100 and a list of 3-5 "keyTakeaways".
        You MUST respond strictly in the following JSON format. Do not add any extra text. All content must be in Simplified Chinese.
        The JSON schema is as follows:
        {
          "companyProfile": { "name": "string", "ticker": "string", "exchange": "string", "sector": "string", "industry": "string", "summary": "string" },
          "keyTakeaways": ["string (3-5个核心要点)"],
          "investmentScore": { "score": "number (1-100)", "reason": "string (简要理由)" },
          "financialTrends": [ { "year": "string", "revenue": "number (单位: 百万)", "netIncome": "number (单位: 百万)" } ],
          "valuationAnalysis": { "judgment": "'undervalued' | 'fairly valued' | 'overvalued'", "methodology": "string", "targetPriceRange": "string", "reasoning": "string" },
          "peerComparison": [ { "name": "string", "ticker": "string", "marketCap": "string", "peRatio": "string", "revenueGrowth": "string", "grossMargin": "string" } ],
          "researchAnalysis": { "consensusRating": "string (例如 '买入')", "targetPriceSummary": "string (例如 '综合目标价 ¥180 - ¥200')", "recentReports": [ { "title": "string", "source": "string", "publishDate": "string", "rating": "string", "summary": "string" } ] },
          "recentNews": [ { "title": "string", "summary": "string", "impact": "'Positive' | 'Neutral' | 'Negative'" } ],
          "swotAnalysis": { "strengths": ["string"], "weaknesses": ["string"], "opportunities": ["string"], "threats": ["string"] },
          "investmentThesis": { "bull": "string", "bear": "string", "conclusion": "string" },
          "riskAnalysis": { "level": "'High' | 'Medium' | 'Low'", "description": "string", "factors": ["string"] },
          "corporateGovernance": { "summary": "string" },
          "esgRating": { "rating": "string", "summary": "string" }
        }
    `;
    }
    return `
        You are a top-tier stock research analyst. Provide a comprehensive, in-depth, and objective analysis report for the given stock.
        It is crucial that you use the latest web search results, market data, and news for your analysis to ensure timeliness.
        Specifically, you MUST search for institutional research reports to create the 'researchAnalysis' section.
        At the beginning of your analysis, you MUST provide a quantitative "investmentScore" from 1-100 and a list of 3-5 "keyTakeaways".
        You MUST respond strictly in the following JSON format. Do not add any extra text. All content must be in English.
        The JSON schema is as follows:
        {
          "companyProfile": { "name": "string", "ticker": "string", "exchange": "string", "sector": "string", "industry": "string", "summary": "string" },
          "keyTakeaways": ["string (3-5 key bullet points)"],
          "investmentScore": { "score": "number (1-100)", "reason": "string (brief justification)" },
          "financialTrends": [ { "year": "string", "revenue": "number (in millions)", "netIncome": "number (in millions)" } ],
          "valuationAnalysis": { "judgment": "'undervalued' | 'fairly valued' | 'overvalued'", "methodology": "string", "targetPriceRange": "string", "reasoning": "string" },
          "peerComparison": [ { "name": "string", "ticker": "string", "marketCap": "string", "peRatio": "string", "revenueGrowth": "string", "grossMargin": "string" } ],
          "researchAnalysis": { "consensusRating": "string (e.g., 'Buy')", "targetPriceSummary": "string (e.g., 'Consensus Target $180 - $200')", "recentReports": [ { "title": "string", "source": "string", "publishDate": "string", "rating": "string", "summary": "string" } ] },
          "recentNews": [ { "title": "string", "summary": "string", "impact": "'Positive' | 'Neutral' | 'Negative'" } ],
          "swotAnalysis": { "strengths": ["string"], "weaknesses": ["string"], "opportunities": ["string"], "threats": ["string"] },
          "investmentThesis": { "bull": "string", "bear": "string", "conclusion": "string" },
          "riskAnalysis": { "level": "'High' | 'Medium' | 'Low'", "description": "string", "factors": ["string"] },
          "corporateGovernance": { "summary": "string" },
          "esgRating": { "rating": "string", "summary": "string" }
        }
    `;
};


export const getStockAnalysis = async (stockQuery: string, model: AnalysisModel, locale: Locale): Promise<StockAnalysisReport> => {
    const modelName = getModelName(model);
    const systemInstruction = getStockAnalysisSystemInstruction(locale);
    
    const prompt = `
        Please provide a comprehensive analysis report for the following stock:
        ---
        ${stockQuery}
        ---
        For the "financialTrends" section, please provide data for the last 3 completed fiscal years. For "peerComparison", identify 2-3 main competitors. For "recentNews", summarize 1-3 most important recent news items. For "researchAnalysis", provide a consensus based on the last 3 months of reports and summarize the 3 most recent reports.
    `;

    return callOpenRouterAI(prompt, systemInstruction, modelName);
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
        You are an expert financial data analyst AI. Your task is to scrape and process institutional research report data for a given stock based on the Chinese market. You MUST follow these steps precisely:
        1.  From the user query, identify the 6-digit stock code. If it's a name, find its code.
        2.  Fetch data from the URL \`https://data.eastmoney.com/report/{code}.html\`.
        3.  Inside the page's HTML, find the JavaScript variable \`var initdata = {...};\` and parse this JSON object.
        4.  The \`data\` key inside this object contains a list of reports. Filter this list to include only reports published within the last 3 months. If there are fewer than 2 reports in the last 3 months, use the 2 most recent ones regardless of date.
        5.  **EPS Forecasts**: 从筛选后的研报中，收集 \`predictThisYearEps\`、\`predictNextYearEps\` 和 \`predictNextTwoYearEps\` 的所有非空值。将它们分别映射到 "2025E"、"2026E" 和 "2027E" 这三年。计算这三个字段各自的平均值。
        6.  **EPS Growth**: Calculate the growth rate for the next year as \`(avg_next_year_eps - avg_this_year_eps) / Math.abs(avg_this_year_eps)\`. Calculate the growth for the year after as \`(avg_next_two_year_eps - avg_next_year_eps) / Math.abs(avg_next_year_eps)\`. Express growth as a percentage (e.g., 15.5 for 15.5%). If a denominator is zero or not available, the growth rate should be null.
        7.  **Target Price**: From the filtered reports, collect all non-null values for \`targetPrice\`. Calculate the highest, lowest, and average values.
        8.  **Current Price**: Fetch the current stock price from \`https://qt.gtimg.cn/q={marketPrefix}{code}\` (e.g., 'sh600519'). The price is the 4th field (index 3) in the tilde-separated response string. If not available, use \`closePrice\` from the most recent report.
        9.  **Recent Reports**: Select the 3 most recent reports from the filtered list. For each, extract \`title\`, \`orgSName\` as institution, \`publishDate\`. Attempt to find a rating (like '买入', '增持', '中性') from the \`ratingName\` field or the title. Generate the PDF URL using \`infoCode\` like so: \`https://pdf.dfcfw.com/pdf/H3_{infoCode}_1.pdf\`.
        10. You MUST respond strictly in the following JSON format. Do not add any extra text or explanations. All numbers should be actual numbers, not strings. Handle cases where data is missing gracefully by using null or empty arrays. All content must be in Simplified Chinese.
        
        JSON Schema: ${commonSchema}
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

export const getResearchReportAnalysis = async (stockQuery: string, model: AnalysisModel, locale: Locale): Promise<ResearchReportConsensus> => {
    const modelName = getModelName(model);
    const systemInstruction = getResearchReportAnalysisSystemInstruction(locale);

    const prompt = `
        Please provide a research report consensus analysis for the following stock:
        ---
        ${stockQuery}
        ---
    `;

    try {
        const result = await callOpenRouterAI(prompt, systemInstruction, modelName);
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

export const getHotStocksFromAI = async (model: AnalysisModel, locale: Locale): Promise<{name: string; ticker: string}[]> => {
    const modelName = getModelName(model);
    const systemInstruction = getHotStocksSystemInstruction(locale);
    const prompt = "Please provide the list of the 10 hottest stocks in the last 24 hours.";

    const response = await callOpenRouterAI(prompt, systemInstruction, modelName);
    if (response && Array.isArray(response.stocks)) {
      return response.stocks;
    }
    throw new Error('AI returned an invalid format for hot stocks.');
};


const getPositionalWarfareSystemInstructions = (locale: Locale) => {
    const langConfig = {
        zh: {
            step1System: `You are a top-tier financial analyst. Your task is to identify the precise details of the provided stock query and provide a brief analysis of its market leadership. Use web search for the latest data. If a metric is not applicable (e.g., P/E for a non-profitable company), use "N/A". Respond strictly in JSON format. All content in Simplified Chinese. Schema: { "name": "string", "ticker": "string", "sector": "string", "market": "string", "analysis": "string (关于其市场领导地位的简要分析)", "metrics": { "marketCap": "string", "peRatio": "string", "revenueGrowth": "string", "recentPerformance": "string" } }`,
            step2System: `You are a sector screener AI. Given a leading stock's profile, find 3 to 5 other publicly traded companies in the same specific sector that could be potential "follower" candidates. Focus on companies with a "lower position" (e.g., smaller market cap). For each, provide its name, ticker, and market. Respond strictly in JSON format. All content in Simplified Chinese. Schema: { "candidates": [{ "name": "string", "ticker": "string", "market": "string" }] }`,
            step3System: `You are a financial data retrieval AI. For the given list of companies, fetch their latest key financial metrics using web search. Provide market cap, P/E ratio, recent revenue growth (YoY), and recent stock performance (last 3 months). If a metric is not applicable, use "N/A". Respond strictly in JSON format. All content in Simplified Chinese. Schema: { "detailedCandidates": [{ "name": "string", "ticker": "string", "market": "string", "metrics": { "marketCap": "string", "peRatio": "string", "revenueGrowth": "string", "recentPerformance": "string" } }] }`,
            step4System: `You are a top-tier fund manager specializing in the "Positional Warfare Strategy". You have been given a leader's profile and potential follower candidates with metrics. Generate a comprehensive strategic report. Include a "strategistSummary". For EACH follower, provide "comparativeAnalysis", "investmentThesis", "potentialCatalysts", "risks", and a "positioningScore" (1-10 with reasoning). Respond strictly in JSON format. All content in Simplified Chinese. Schema: { "strategistSummary": "string", "followerAnalysis": [ { "ticker": "string", "comparativeAnalysis": "string", "investmentThesis": "string", "potentialCatalysts": ["string"], "risks": ["string"], "positioningScore": { "score": "number", "reasoning": "string" } } ] }`,
        },
        en: {
            step1System: `You are a top-tier financial analyst. Your task is to identify the precise details of the provided stock query and provide a brief analysis of its market leadership. Use web search for the latest data. If a metric is not applicable (e.g., P/E for a non-profitable company), use "N/A". Respond strictly in JSON format. All content in English. Schema: { "name": "string", "ticker": "string", "sector": "string", "market": "string", "analysis": "string (A concise analysis of its market leadership)", "metrics": { "marketCap": "string", "peRatio": "string", "revenueGrowth": "string", "recentPerformance": "string" } }`,
            step2System: `You are a sector screener AI. Given a leading stock's profile, find 3 to 5 other publicly traded companies in the same specific sector that could be potential "follower" candidates. Focus on companies with a "lower position" (e.g., smaller market cap). For each, provide its name, ticker, and market. Respond strictly in JSON format. All content in English. Schema: { "candidates": [{ "name": "string", "ticker": "string", "market": "string" }] }`,
            step3System: `You are a financial data retrieval AI. For the given list of companies, fetch their latest key financial metrics using web search. Provide market cap, P/E ratio, recent revenue growth (YoY), and recent stock performance (last 3 months). If a metric is not applicable, use "N/A". Respond strictly in JSON format. All content in English. Schema: { "detailedCandidates": [{ "name": "string", "ticker": "string", "market": "string", "metrics": { "marketCap": "string", "peRatio": "string", "revenueGrowth": "string", "recentPerformance": "string" } }] }`,
            step4System: `You are a top-tier fund manager specializing in the "Positional Warfare Strategy". You have been given a leader's profile and potential follower candidates with metrics. Generate a comprehensive strategic report. Include a "strategistSummary". For EACH follower, provide "comparativeAnalysis", "investmentThesis", "potentialCatalysts", "risks", and a "positioningScore" (1-10 with reasoning). Respond strictly in JSON format. All content in English. Schema: { "strategistSummary": "string", "followerAnalysis": [ { "ticker": "string", "comparativeAnalysis": "string", "investmentThesis": "string", "potentialCatalysts": ["string"], "risks": ["string"], "positioningScore": { "score": "number", "reasoning": "string" } } ] }`,
        }
    };
    return langConfig[locale];
}

export const getPositionalWarfareAnalysis = async (
    leaderStockQuery: string,
    onProgress: (message: string) => void,
    model: AnalysisModel,
    locale: Locale
): Promise<PositionalWarfareReport> => {
    const modelName = getModelName(model);
    const { step1System, step2System, step3System, step4System } = getPositionalWarfareSystemInstructions(locale);

    onProgress(locale === 'zh' ? "正在锁定并深度剖析龙头... 🎯" : "Locking and profiling the leader... 🎯");
    const leaderProfile: LeaderStockProfile = await callOpenRouterAI(leaderStockQuery, step1System, modelName);

    onProgress(locale === 'zh' ? "正在海选同板块潜力股... 🔍" : "Screening for potential followers... 🔍");
    const step2Prompt = locale === 'zh' ? `龙头股票资料: ${JSON.stringify(leaderProfile)}` : `Leader Stock Profile: ${JSON.stringify(leaderProfile)}`;
    const screeningResult = await callOpenRouterAI(step2Prompt, step2System, modelName);
    const candidates = screeningResult.candidates || [];
    if (candidates.length === 0) throw new Error(locale === 'zh' ? "未能找到合适的潜力补涨股。" : "Could not find suitable follower candidates.");

    onProgress(locale === 'zh' ? "正在分析候选股财务指标... 📊" : "Analyzing candidate financials... 📊");
    const step3Prompt = locale === 'zh' ? `公司列表: ${JSON.stringify(candidates)}` : `Companies List: ${JSON.stringify(candidates)}`;
    const metricsResult = await callOpenRouterAI(step3Prompt, step3System, modelName);
    const detailedCandidates = metricsResult.detailedCandidates || [];

    onProgress(locale === 'zh' ? "正在生成核心观点总结... ⚔️" : "Synthesizing final strategy... ⚔️");
    const step4Prompt = locale === 'zh' ? `龙头股票: ${JSON.stringify(leaderProfile)}\n\n潜力补涨股及指标: ${JSON.stringify(detailedCandidates)}` : `Leader Stock: ${JSON.stringify(leaderProfile)}\n\nFollower Candidates with Metrics: ${JSON.stringify(detailedCandidates)}`;
    const finalAnalysis = await callOpenRouterAI(step4Prompt, step4System, modelName);
    
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
