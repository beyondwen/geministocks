import type { AnalysisReport, StockAnalysisReport } from '../types';

const OPENROUTER_API_KEY = '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = 'x-ai/grok-4-fast:free';
const SITE_URL = 'https://stock-digger.ai'; 
const SITE_TITLE = '股市超级挖掘机';

/**
 * Extracts a JSON object from a string. It handles cases where the JSON is
 * wrapped in markdown-style code blocks (```json ... ```).
 * @param text The string potentially containing the JSON.
 * @returns The parsed JavaScript object.
 * @throws An error if parsing fails.
 */
const extractJson = (text: string): any => {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);
    const jsonString = match ? match[1] : text;

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON response from AI:", jsonString);
        throw new Error("Invalid JSON response from AI model.");
    }
};

const analysisSchemaString = `{
    "summary": "string (关于核心事件或主题的1-3句话摘要)",
    "analysis": {
        "macroPolicy": "string (分析该事件与当前宏观经济环境和相关政策的关联)",
        "industryChain": {
            "upstream": [{"name": "string", "description": "string"}],
            "midstream": [{"name": "string", "description": "string"}],
            "downstream": [{"name": "string", "description": "string"}]
        },
        "companyFundamentals": "string (分析事件对核心公司的财务、技术、市场地位可能产生的正面或负面影响)",
        "marketSentiment": {
            "sentiment": "'Positive' | 'Neutral' | 'Negative'",
            "description": "string"
        }
    },
    "investmentStrategy": {
        "logic": "string (基于四维一体分析凝练出的核心投资逻辑)",
        "suggestion": "string (策略建议，例如是短期交易型机会还是长期价值布局)",
        "risks": "string (明确提示可能面临的潜在风险)"
    },
    "recommendedStocks": [{
        "name": "string",
        "ticker": "string",
        "market": "'A-Share' | 'Hong Kong' | 'US' | 'Other'",
        "reason": "string",
        "relevance": "'High' | 'Medium' | 'Low'"
    }]
}`;


export const getAnalysis = async (topic: string): Promise<AnalysisReport> => {
    try {
        const prompt = `
          你是一位专业的金融分析师，专长于投资研究。你的任务是使用“四维一体立体化挖掘法”来分析所提供的财经新闻、主题或文本。你的分析必须具有时效性，请结合最新的网络信息和市场数据进行。基于你的分析，请提供一份结构化的投资策略报告。

          “四维一体立体化挖掘法”包含以下四个维度：
          1.  宏观与政策面 (macroPolicy)
          2.  行业与产业链 (industryChain)
          3.  公司基本面 (companyFundamentals)
          4.  市场情绪与催化剂 (marketSentiment)

          这是需要分析的文本：
          ---
          ${topic}
          ---

          请严格按照以下 JSON 格式返回你的分析报告，不要添加任何额外的解释或文本。
          \`\`\`json
          ${analysisSchemaString}
          \`\`\`
        `;
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': SITE_URL,
                'X-Title': encodeURIComponent(SITE_TITLE)
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        return extractJson(content) as AnalysisReport;

    } catch (error) {
        console.error('Error in getAnalysis:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        throw new Error(`Failed to get analysis. Reason: ${errorMessage}`);
    }
};

const stockAnalysisSchemaString = `{
    "companyProfile": {
        "name": "string",
        "ticker": "string",
        "exchange": "string",
        "sector": "string",
        "industry": "string",
        "summary": "string"
    },
    "financialSummary": {
        "period": "string",
        "highlights": [{
            "metric": "string",
            "value": "string",
            "comment": "string"
        }]
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
}`;

export const getStockAnalysis = async (stockQuery: string): Promise<StockAnalysisReport> => {
    try {
        const prompt = `
          你是一位顶级的股票研究分析师，拥有多年的金融市场经验。你的任务是针对给定的股票（通过名称或代码识别）提供一份全面、深入、客观的综合分析报告。

          为确保报告的时效性，请务必结合最新的网络搜索结果、市场数据和相关新闻进行分析。
          
          你的分析需要包含以下几个核心部分：
          1.  公司概况 (Company Profile)
          2.  财务摘要 (Financial Summary)
          3.  SWOT 分析
          4.  投资论点 (Investment Thesis)
          5.  风险分析 (Risk Analysis)
          6.  公司治理 (Corporate Governance)
          7.  ESG 评级 (ESG Rating)

          分析的股票是:
          ---
          ${stockQuery}
          ---

          请严格按照以下 JSON 格式返回你的分析报告，不要添加任何额外的解释或文本。
          \`\`\`json
          ${stockAnalysisSchemaString}
          \`\`\`
        `;
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': SITE_URL,
                'X-Title': encodeURIComponent(SITE_TITLE)
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        return extractJson(content) as StockAnalysisReport;
    } catch (error) {
        console.error('Error in getStockAnalysis:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        throw new Error(`Failed to get stock analysis. Reason: ${errorMessage}`);
    }
};