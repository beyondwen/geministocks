import type { AnalysisReport, StockAnalysisReport, PositionalWarfareReport, LeaderStockProfile, ResearchReportConsensus } from '../types';
import type { Locale } from '../hooks/useI18n';
import { GoogleGenAI, Type } from '@google/genai';

// --- OpenRouter Configuration ---
const API_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
// The API key is Base64 encoded for basic obfuscation in the client-side code.
const OPENROUTER_API_KEY_B64 = 'c2stb3ItdjEtM2QyNWM4NzRjOWM4ODJhZjVmYTM3ZDA0MmMxMmY0ZjEyZGYxYzIyZWNjMzE5ZTUyMzdkM2E4ZjdmYjE2NTgxNg==';
const SITE_URL = 'https://mastersgo.cc';
const SITE_NAME = '超级挖掘机';

const getModelName = (isRealtimeSearchEnabled: boolean): string => {
    if (isRealtimeSearchEnabled) {
        return 'google/gemini-2.0-pro-exp-02-05:free';
    }
    return 'openai/gpt-4o-mini';
};

const getModelDisplayName = (isRealtimeSearchEnabled: boolean): string => {
    if (isRealtimeSearchEnabled) {
        return 'Gemini 3 Pro';
    }
    return 'GPT-4o mini';
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
        // The Grok model via OpenRouter has issues with `tool_choice` and `response_format`.
        // By NOT setting either, we rely on its instruction-following capability from the system prompt.
        if (!modelName.startsWith('x-ai/grok')) {
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
        const firstBracketIndex = jsonString.indexOf('[');
        
        let startIndex = -1;
        if (firstBraceIndex !== -1 && firstBracketIndex !== -1) {
            startIndex = Math.min(firstBraceIndex, firstBracketIndex);
        } else if (firstBraceIndex !== -1) {
            startIndex = firstBraceIndex;
        } else {
            startIndex = firstBracketIndex;
        }

        const lastBraceIndex = jsonString.lastIndexOf('}');
        const lastBracketIndex = jsonString.lastIndexOf(']');
        
        let endIndex = -1;
        if (lastBraceIndex !== -1 && lastBracketIndex !== -1) {
            endIndex = Math.max(lastBraceIndex, lastBracketIndex);
        } else if (lastBraceIndex !== -1) {
            endIndex = lastBraceIndex;
        } else {
            endIndex = lastBracketIndex;
        }


        if (startIndex !== -1 && endIndex > startIndex) {
            jsonString = jsonString.substring(startIndex, endIndex + 1);
        }

        // FIX: The AI model can sometimes generate malformed JSON.
        // This block attempts to parse, and on any SyntaxError, applies fixes and retries.
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            // Broaden the condition to catch any SyntaxError for auto-correction.
            // AI models can return various forms of malformed JSON, and specific message checks can be brittle across different browsers/environments.
            if (e instanceof SyntaxError) {
                console.warn("Initial JSON parsing failed due to SyntaxError. Attempting to auto-correct.", e);
                try {
                    // Correction attempt 1: Add missing commas between properties ending with quotes, brackets, or braces, and a new property.
                    let correctedJson = jsonString.replace(/([}\]"])\s*(")/g, "$1,$2");
                    
                    // Correction attempt 2: Add missing commas between objects in an array.
                    correctedJson = correctedJson.replace(/}(?=\s*\{)/g, '},');
                    
                    return JSON.parse(correctedJson);
                } catch (correctionError) {
                    console.error("Auto-correction of JSON failed. The error is likely more complex.", correctionError);
                    // Re-throw a more informative error after a failed correction attempt.
                    throw new Error(`Failed to parse AI response after attempting auto-correction. The response was: ${content}`);
                }
            }
            // If the error is not a SyntaxError, re-throw it immediately.
            throw e;
        }

    } catch (error) {
        console.error('Error calling OpenRouter AI:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during the API call.';
        throw new Error(`AI analysis failed. Reason: ${errorMessage}`);
    }
}

const getAnalysisSystemInstructions = (locale: Locale, modelDisplayName: string) => {
    const commonInstructions = `You are a top-tier financial analyst. Your task is to analyze the provided text using a deeply quantitative and qualitative method, incorporating the latest web information. You MUST respond strictly in JSON format. Do not add any extra text.`;
    const languageInstruction = locale === 'zh' ? 'All content must be in Simplified Chinese.' : 'All content must be in English.';

    const part1Schema = `{
      "summary": "string (1-3 sentence summary)",
      "investmentScore": { "score": "number (1-100)", "reason": "string (brief justification for the score)" },
      "analysis": {
        "macroPolicy": "string (must include specific macro data like CPI/PPI)",
        "industryChain": { "upstream": [{"name": "string", "description": "string"}], "midstream": [{"name": "string", "description": "string"}], "downstream": [{"name": "string", "description": "string"}] },
        "companyFundamentals": "string",
        "marketSentiment": { "sentiment": "'Positive' | 'Neutral' | 'Negative'", "description": "string" }
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
      "riskMatrix": [{ "risk": "string", "probability": "'High' | 'Medium' | 'Low'", "impact": "'High' | 'Medium' | 'Low'", "mitigation": "string" }],
      "allocationCadenceAndOutlook": "string",
      "tieredSuggestions": {
        "coreHoldings": [{ "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'", "reason": "string", "relevance": "'High'" }],
        "strategicSatellites": [{ "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'", "reason": "string", "relevance": "'Medium'" }],
        "watchlist": [{ "name": "string", "ticker": "string", "market": "'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other'", "reason": "string", "relevance": "'Low'" }]
      },
      "associationAnalysis": {
        "relatedStocks": [{ "name": "string", "ticker": "string", "reason": "string" }],
        "relatedTopics": [{ "name": "string", "reason": "string" }]
      }
    }`;

    return {
        part1System: `${commonInstructions} You will generate the first part of the analysis: Core Analysis. ${languageInstruction} The JSON schema is: ${part1Schema}`,
        part2System: `${commonInstructions} You will generate the second part of the analysis: Deep Dives into market, competition, catalysts, policy, and tech. ${languageInstruction} The JSON schema is: ${part2Schema}`,
        part3System: `${commonInstructions} You will generate the final part of the analysis: Strategy & Suggestions. ${languageInstruction} You MUST populate the "modelUsed" field with this exact value: "${modelDisplayName}". The JSON schema is: ${part3Schema}`
    };
};

export const getAnalysis = async (topic: string, onProgress: (stepIndex: number) => void, locale: Locale, isRealtimeSearchEnabled: boolean): Promise<AnalysisReport> => {
    const modelName = getModelName(isRealtimeSearchEnabled);
    const modelDisplayName = getModelDisplayName(isRealtimeSearchEnabled);
    const { part1System, part2System, part3System } = getAnalysisSystemInstructions(locale, modelDisplayName);

    const prompt = `Please analyze the following text: --- ${topic} ---`;

    onProgress(0); // "Running core analysis..."
    const part1Result = await callOpenRouterAI(prompt, part1System, modelName);
    
    onProgress(1); // "Performing deep dives..."
    const part2Result = await callOpenRouterAI(prompt, part2System, modelName);

    onProgress(2); // "Formulating strategy & suggestions..."
    const part3Result = await callOpenRouterAI(prompt, part3System, modelName);
    
    onProgress(3); // "Finalizing report..."

    // Combine results from all parts
    const finalReport: AnalysisReport = {
        ...part1Result,
        ...part2Result,
        ...part3Result,
        modelUsed: modelDisplayName,
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


export const getPolymarketAnalysis = async (url: string, locale: Locale, isRealtimeSearchEnabled: boolean): Promise<AnalysisReport> => {
    const modelName = getModelName(isRealtimeSearchEnabled);
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
        3.  **战略分析**: SWOT、投资论点（看涨/看跌）、风险分析。
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
    locale: Locale, 
    isRealtimeSearchEnabled: boolean
): Promise<StockAnalysisReport> => {
    onProgress(0); // "Analyzing core fundamentals..."
    const modelName = getModelName(isRealtimeSearchEnabled);
    const systemInstruction = getStockAnalysisSystemInstruction(locale);
    
    const prompt = `
        Please provide a comprehensive analysis report for the following stock:
        ---
        ${stockQuery}
        ---
    `;

    const reportPart: Omit<StockAnalysisReport, 'researchReportConsensus'> = await callOpenRouterAI(prompt, systemInstruction, modelName);
    
    onProgress(1); // "Aggregating institutional research..."
    
    const researchData = await getResearchReportAnalysis(stockQuery, locale, isRealtimeSearchEnabled);
    
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
        1.  从用户查询中识别出6位数的股票代码。如果是公司名称，请找出其代码。
        2.  访问 URL \`https://data.eastmoney.com/report/{code}.html\` 来获取数据。
        3.  在页面HTML中，找到一个名为 \`var initdata = {...};\` 的JavaScript变量并解析这个JSON对象。
        4.  该对象中的 \`data\` 键包含一个研报列表。筛选这个列表，只保留最近3个月内发布的研报。如果最近3个月内少于2份，则使用最新的2份。
        5.  **EPS 预测**: 从筛选后的研报中，收集 \`predictThisYearEps\`、\`predictNextYearEps\` 和 \`predictNextTwoYearEps\` 的所有非空值。将它们分别映射到 "2025E"、"2026E" 和 "2027E" 这三年。计算这三个字段各自的平均值。
        6.  **EPS 增长率**: 计算明年的增长率公式为 \`(avg_next_year_eps - avg_this_year_eps) / Math.abs(avg_this_year_eps)\`。计算后年的增长率公式为 \`(avg_next_two_year_eps - avg_next_year_eps) / Math.abs(avg_next_year_eps)\`。结果表示为百分比（例如，15.5代表15.5%）。如果分母为零或不可用，增长率应为null。
        7.  **目标价**: 从筛选后的研报中，收集所有非空的 \`targetPrice\` 值。计算最高、最低和平均值。
        8.  **当前股价**: 从 \`https://qt.gtimg.cn/q={marketPrefix}{code}\` (例如 'sh600519') 获取当前股价。价格是返回的以波浪线分隔的字符串中的第4个字段（索引3）。如果无法获取，则使用最新研报中的 \`closePrice\`。
        9.  **近期研报**: 从筛选列表中选择最新的3份研报。为每份报告提取 \`title\`, \`orgSName\` (作为 institution), \`publishDate\`。尝试从 \`ratingName\` 字段或标题中找到评级（如 '买入', '增持'）。使用 \`infoCode\` 生成PDF URL，格式为: \`https://pdf.dfcfw.com/pdf/H3_{infoCode}_1.pdf\`。
        10. 你必须严格以JSON格式回应。不要添加任何额外文本。所有数字都应该是number类型。如果数据缺失，请使用null或空数组。所有内容必须是简体中文。
        
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

export const getResearchReportAnalysis = async (stockQuery: string, locale: Locale, isRealtimeSearchEnabled: boolean): Promise<ResearchReportConsensus> => {
    const modelName = getModelName(isRealtimeSearchEnabled);
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

export const getHotStocksFromAI = async (locale: Locale, isRealtimeSearchEnabled: boolean): Promise<{name: string; ticker: string}[]> => {
    const modelName = getModelName(isRealtimeSearchEnabled);
    const systemInstruction = getHotStocksSystemInstruction(locale);
    const prompt = "Please provide the list of the 10 hottest stocks in the last 24 hours.";

    const response = await callOpenRouterAI(prompt, systemInstruction, modelName);
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
    locale: Locale,
    isRealtimeSearchEnabled: boolean
): Promise<LeaderStockProfile> => {
    const modelName = getModelName(isRealtimeSearchEnabled);
    const systemInstruction = getFindLeaderInstruction(locale);
    return await callOpenRouterAI(query, systemInstruction, modelName);
};

export const getPositionalWarfareFollowerAnalysis = async (
    leaderProfile: LeaderStockProfile,
    onProgress: (stepIndex: number) => void,
    locale: Locale,
    isRealtimeSearchEnabled: boolean
): Promise<PositionalWarfareReport> => {
    const modelName = getModelName(isRealtimeSearchEnabled);
    const { step2System, step3System, step4System } = getFollowerAnalysisInstructions(locale);

    onProgress(1); // Screening for followers
    const step2Prompt = locale === 'zh' ? `龙头股票资料: ${JSON.stringify(leaderProfile)}` : `Leader Stock Profile: ${JSON.stringify(leaderProfile)}`;
    const screeningResult = await callOpenRouterAI(step2Prompt, step2System, modelName);
    const candidates = screeningResult.candidates || [];
    if (candidates.length === 0) throw new Error(locale === 'zh' ? "未能找到合适的潜力补涨股。" : "Could not find suitable follower candidates.");

    onProgress(2); // Analyzing candidate financials
    const step3Prompt = locale === 'zh' ? `公司列表: ${JSON.stringify(candidates)}` : `Companies List: ${JSON.stringify(candidates)}`;
    const metricsResult = await callOpenRouterAI(step3Prompt, step3System, modelName);
    const detailedCandidates = metricsResult.detailedCandidates || [];

    onProgress(3); // Synthesizing final strategy
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
        followerCandidates: finalFollowers as any[],
    };

    return finalReport;
};
