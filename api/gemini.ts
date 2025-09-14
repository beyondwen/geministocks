import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisReport } from '../types';

// This is a Vercel Serverless Function, which runs on the server.
// It can safely access environment variables.

// Define the response structure for Vercel functions to match Express-like API
interface VercelResponse {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  json: (body: any) => void;
  send: (body: string) => void;
}

// Define the request structure
interface VercelRequest {
  method: string;
  body: {
    topic: string;
  };
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "关于核心事件或主题的1-3句话摘要。",
    },
    analysis: {
      type: Type.OBJECT,
      properties: {
        macroPolicy: {
          type: Type.STRING,
          description: "分析该事件与当前宏观经济环境和相关政策的关联。",
        },
        industryChain: {
          type: Type.STRING,
          description: "分析对相关行业及其产业链（上游、中游、下游）的传导效应。",
        },
        companyFundamentals: {
          type: Type.STRING,
          description: "分析事件对核心公司的财务、技术、市场地位可能产生的正面或负面影响。",
        },
        marketSentiment: {
          type: Type.STRING,
          description: "评估该事件在资本市场的关注度、可能引发的市场情绪以及其作为股价催化剂的潜力。",
        },
      },
      required: ["macroPolicy", "industryChain", "companyFundamentals", "marketSentiment"],
    },
    investmentStrategy: {
      type: Type.OBJECT,
      properties: {
        logic: {
          type: Type.STRING,
          description: "基于四维一体分析凝练出的核心投资逻辑。",
        },
        suggestion: {
          type: Type.STRING,
          description: "策略建议，例如是短期交易型机会还是长期价值布局。",
        },
        risks: {
          type: Type.STRING,
          description: "明确提示可能面临的潜在风险（政策风险、技术风险、市场竞争风险等）。",
        },
      },
      required: ["logic", "suggestion", "risks"],
    },
    recommendedStocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "公司名称" },
          ticker: { type: Type.STRING, description: "股票代码" },
          market: {
            type: Type.STRING,
            enum: ["A-Share", "Hong Kong", "US", "Other"],
            description: "所属市场（A-Share, Hong Kong, US, Other）",
          },
          reason: {
            type: Type.STRING,
            description: "一句话概括的推荐理由，需关联分析结论。",
          },
          relevance: {
            type: Type.STRING,
            enum: ["High", "Medium", "Low"],
            description: "与分析事件的关联度（高/中/低）。",
          },
        },
        required: ["name", "ticker", "market", "reason", "relevance"],
      },
    },
  },
  required: ["summary", "analysis", "investmentStrategy", "recommendedStocks"],
};

const buildPrompt = (topic: string): string => {
  return `
    你是一位专业的金融分析师，专长于投资研究。你的任务是使用“四维一体立体化挖掘法”来分析所提供的财经新闻、主题或文本。基于你的分析，请提供一份结构化的投资策略报告，该报告必须是严格遵守所提供 schema 的 JSON 格式。

    “四维一体立体化挖掘法”包含以下四个维度：
    1.  宏观与政策面 (macroPolicy): 分析事件与宏观经济环境（如利率、通胀）和相关政策的关联。
    2.  行业与产业链 (industryChain): 分析对核心行业及其产业链（上游、中游、下游）的影响。
    3.  公司基本面 (companyFundamentals): 分析对核心公司的财务、技术和市场地位的潜在影响。
    4.  市场情绪与催化剂 (marketSentiment): 评估事件的市场关注度、情绪以及成为股价催化剂的潜力。

    这是需要分析的文本：
    ---
    ${topic}
    ---

    请立即生成完整的分析报告。确保你的输出是一个符合所要求 schema 的、单一且有效的 JSON 对象。
  `;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required for analysis' });
  }
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key is not configured on the server." });
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildPrompt(topic),
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const jsonText = response.text?.trim();
    if (!jsonText) {
      throw new Error("Received an empty response from the AI model for analysis.");
    }
    
    const result = JSON.parse(jsonText);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ error: `Failed to get data from Gemini. Reason: ${errorMessage}` });
  }
}