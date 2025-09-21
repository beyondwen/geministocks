import type { AnalysisReport, StockAnalysisReport } from '../types';

const API_KEY = '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';
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'x-ai/grok-4-fast:free';

// Common function to call the OpenRouter API
const callOpenRouter = async (prompt: string): Promise<any> => {
    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error Body:', errorBody);
        throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const jsonText = data.choices[0]?.message?.content?.trim();
    if (!jsonText) {
        throw new Error("Received an empty or invalid response from the AI model.");
    }

    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON response:", jsonText);
        throw new Error("AI model returned malformed JSON.");
    }
};


// --- Topic Analysis Service ---

const analysisSchemaDescription = `
{
  "summary": "关于核心事件或主题的1-3句话摘要。",
  "analysis": {
    "macroPolicy": "分析该事件与当前宏观经济环境和相关政策的关联。",
    "industryChain": {
        "upstream": [{ "name": "上游环节/组件的名称", "description": "对该环节/组件的简要描述" }],
        "midstream": [{ "name": "中游环节/组件的名称", "description": "对该环节/组件的简要描述" }],
        "downstream": [{ "name": "下游环节/组件的名称", "description": "对该环节/组件的简要描述" }]
    },
    "companyFundamentals": "分析事件对核心公司的财务、技术、市场地位可能产生的正面或负面影响。",
    "marketSentiment": {
      "sentiment": "Positive",
      "description": "对市场情绪和催化剂潜力的详细文字分析。"
    }
  },
  "investmentStrategy": {
    "logic": "基于四维一体分析凝练出的核心投资逻辑。",
    "suggestion": "策略建议，例如是短期交易型机会还是长期价值布局。",
    "risks": "明确提示可能面临的潜在风险。"
  },
  "recommendedStocks": [
    {
      "name": "公司名称",
      "ticker": "股票代码",
      "market": "A-Share",
      "reason": "一句话概括的推荐理由。",
      "relevance": "High"
    }
  ]
}
`;

const buildPrompt = (topic: string): string => {
  return `
    你是一位专业的金融分析师，专长于投资研究。你的任务是使用“四维一体立体化挖掘法”来分析所提供的财经新闻、主题或文本。你的分析必须具有时效性，请结合最新的网络信息和市场数据进行。基于你的分析，请提供一份结构化的投资策略报告。

    你的输出必须是一个严格遵循以下 JSON 结构的、单一且有效的 JSON 对象。不要包含任何 markdown 代码块或额外的解释性文本。

    JSON 结构:
    ${analysisSchemaDescription}

    “四维一体立体化挖掘法”包含以下四个维度：
    1.  宏观与政策面 (macroPolicy)
    2.  行业与产业链 (industryChain)
    3.  公司基本面 (companyFundamentals)
    4.  市场情绪与催化剂 (marketSentiment)

    这是需要分析的文本：
    ---
    ${topic}
    ---

    请立即生成完整的分析报告。
  `;
};

export const getAnalysis = async (topic: string): Promise<AnalysisReport> => {
    try {
        const prompt = buildPrompt(topic);
        return await callOpenRouter(prompt) as AnalysisReport;
    } catch (error) {
        console.error('Error in getAnalysis:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        throw new Error(`Failed to get analysis. Reason: ${errorMessage}`);
    }
};

// --- Stock Analysis Service ---

const stockAnalysisSchemaDescription = `
{
  "companyProfile": {
    "name": "公司全名",
    "ticker": "股票代码",
    "exchange": "上市交易所",
    "sector": "所属行业板块",
    "industry": "所属具体行业",
    "summary": "公司业务简介"
  },
  "financialSummary": {
    "period": "财报周期，例如 '最近财年' 或 '最新季度'",
    "highlights": [
      {
        "metric": "营收",
        "value": "100亿",
        "comment": "同比增长10%"
      }
    ]
  },
  "swotAnalysis": {
    "strengths": ["优势 (Strengths)"],
    "weaknesses": ["劣势 (Weaknesses)"],
    "opportunities": ["机会 (Opportunities)"],
    "threats": ["威胁 (Threats)"]
  },
  "investmentThesis": {
    "bull": "看涨理由 (Bull Case)",
    "bear": "看跌理由 (Bear Case)",
    "conclusion": "综合投资结论"
  },
  "riskAnalysis": {
    "level": "Medium",
    "description": "风险评级描述",
    "factors": ["主要风险因素列表"]
  },
  "corporateGovernance": {
    "summary": "对公司治理结构的分析总结。"
  },
  "esgRating": {
    "rating": "AA",
    "summary": "对公司在环境、社会和治理 (ESG) 方面表现的总结。"
  }
}
`;

const buildStockPrompt = (stockQuery: string): string => {
  return `
    你是一位顶级的股票研究分析师，拥有多年的金融市场经验。你的任务是针对给定的股票（通过名称或代码识别）提供一份全面、深入、客观的综合分析报告。

    为确保报告的时效性，请务必结合最新的网络搜索结果、市场数据和相关新闻进行分析。
    
    你的输出必须是一个严格遵循以下 JSON 结构的、单一且有效的 JSON 对象。不要包含任何 markdown 代码块或额外的解释性文本。

    JSON 结构:
    ${stockAnalysisSchemaDescription}

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

    请立即生成完整的分析报告。
  `;
};

export const getStockAnalysis = async (stockQuery: string): Promise<StockAnalysisReport> => {
    try {
        const prompt = buildStockPrompt(stockQuery);
        return await callOpenRouter(prompt) as StockAnalysisReport;
    } catch (error) {
        console.error('Error in getStockAnalysis:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        throw new Error(`Failed to get stock analysis. Reason: ${errorMessage}`);
    }
};
