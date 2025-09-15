import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisReport } from '../types';

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
            type: Type.OBJECT,
            description: "分析对相关行业及其产业链（上游、中游、下游）的传导效应。每个环节应列出关键组成部分及其描述。",
            properties: {
                upstream: {
                    type: Type.ARRAY,
                    description: "产业链上游，提供原材料或初级产品的环节。",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "上游环节/组件的名称" },
                            description: { type: Type.STRING, description: "对该环节/组件的简要描述" },
                        },
                        required: ["name", "description"]
                    }
                },
                midstream: {
                    type: Type.ARRAY,
                    description: "产业链中游，进行加工、制造或组装的环节。",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "中游环节/组件的名称" },
                            description: { type: Type.STRING, description: "对该环节/组件的简要描述" },
                        },
                        required: ["name", "description"]
                    }
                },
                downstream: {
                    type: Type.ARRAY,
                    description: "产业链下游，面向终端市场和消费者的环节。",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "下游环节/组件的名称" },
                            description: { type: Type.STRING, description: "对该环节/组件的简要描述" },
                        },
                        required: ["name", "description"]
                    }
                }
            },
            required: ["upstream", "midstream", "downstream"]
          },
          companyFundamentals: {
            type: Type.STRING,
            description: "分析事件对核心公司的财务、技术、市场地位可能产生的正面或负面影响。",
          },
          marketSentiment: {
            type: Type.OBJECT,
            description: "评估该事件在资本市场的关注度、可能引发的市场情绪以及其作为股价催化剂的潜力。",
            properties: {
              sentiment: {
                type: Type.STRING,
                enum: ["Positive", "Neutral", "Negative"],
                description: "对市场情绪的总体评估（正面、中性或负面）。"
              },
              description: {
                type: Type.STRING,
                description: "对市场情绪和催化剂潜力的详细文字分析。"
              }
            },
            required: ["sentiment", "description"]
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
    2.  行业与产业链 (industryChain): 分析对核心行业及其产业链（上游、中游、下游）的影响。请为每个环节提供关键组成部分及其描述。
    3.  公司基本面 (companyFundamentals): 分析对核心公司的财务、技术和市场地位的潜在影响。
    4.  市场情绪与催化剂 (marketSentiment): 评估事件的市场关注度、情绪以及成为股价催化剂的潜力。请提供一个总体情绪评估（'Positive', 'Neutral', 'Negative'）和详细的文字描述。

    这是需要分析的文本：
    ---
    ${topic}
    ---

    请立即生成完整的分析报告。确保你的输出是一个符合所要求 schema 的、单一且有效的 JSON 对象。
  `;
};

export const getAnalysis = async (topic: string, apiKey: string, model: string): Promise<AnalysisReport> => {
    if (!apiKey) {
      throw new Error("API key is not provided.");
    }
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: model,
        contents: buildPrompt(topic),
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
        },
      });
  
      const jsonText = response.text?.trim();
      if (!jsonText) {
        throw new Error("Received an empty response from the AI model.");
      }
      
      return JSON.parse(jsonText) as AnalysisReport;
  
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      throw new Error(`Failed to get analysis from Gemini. Reason: ${errorMessage}`);
    }
  };